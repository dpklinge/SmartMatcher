import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pandas as pd

from benchmark import ALLOWED, GROUPS, acquire, estimator, features, split_indices, targets


class BenchmarkTests(unittest.TestCase):
    def test_source_hash_mismatch_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            (path / 'source').write_bytes(b'changed release')
            with patch('benchmark.DATA', path), patch('benchmark.SOURCES', {'source': ('https://example.invalid', '0' * 64)}):
                with self.assertRaisesRegex(ValueError, 'Source changed'):
                    acquire()

    def test_no_silent_network_download(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch('benchmark.DATA', Path(directory)), patch('benchmark.SOURCES', {'source': ('https://example.invalid', '0' * 64)}):
                with self.assertRaises(FileNotFoundError):
                    acquire()

    def fixture(self):
        return pd.DataFrame({
            'w1_partnership_status': [1, 2, 1, 1, 1, 3, 2, 1, 1],
            'w2_surveyed': [1, 1, 1, 0, 1, 1, 1, 1, 1],
            'w2_section': [1, 4, 2, np.nan, 2, 6, 3, 2, 1],
            'w2_relationship_end': [0, 2, 3, np.nan, 0, 0, 0, 1, 2],
            'w2_rel_qual_combo': [1, 1, 1, np.nan, 1, 1, 4, np.nan, 1],
        })

    def test_labels_require_partner_continuity_and_observation(self):
        result = targets(self.fixture())
        np.testing.assert_equal(result['breakup'].to_numpy(),
                                [0, 1, np.nan, np.nan, np.nan, np.nan, 0, 1, np.nan])
        np.testing.assert_equal(result['ended_or_fair_poor_quality'].to_numpy(),
                                [0, 1, np.nan, np.nan, np.nan, np.nan, 1, 1, np.nan])

    def test_missing_quality_is_not_unhappy(self):
        df = self.fixture()
        df.loc[0, 'w2_rel_qual_combo'] = np.nan
        self.assertEqual(targets(df)['breakup'][0], 0)
        self.assertTrue(np.isnan(targets(df)['ended_or_fair_poor_quality'][0]))

    def test_unknown_end_codes_are_excluded(self):
        df = self.fixture()
        df.loc[0, 'w2_relationship_end'] = 99
        self.assertTrue(np.isnan(targets(df)['breakup'][0]))

    def test_features_fail_closed_and_refusals_are_missing(self):
        for forbidden in ['caseid_new', 'w2_rel_qual_combo', 'w1_q21e_year', 'w2_attrition_adj_weights']:
            with self.assertRaises(ValueError):
                features(pd.DataFrame(), [forbidden])
        self.assertTrue(all(c.startswith('w1_') for c in ALLOWED))
        self.assertTrue(all(set(cs) <= ALLOWED for cs in GROUPS.values()))
        df = features(pd.DataFrame({'w1_q9': [-1, 32]}), ['w1_q9'])
        self.assertTrue(np.isnan(df.iloc[0, 0]))
        self.assertEqual(df.iloc[1, 0], 32)

    def test_disjoint_reproducible_participant_splits(self):
        df = pd.DataFrame({'caseid_new': np.arange(200)})
        y = pd.Series(np.tile([0, 0, 0, 1], 50))
        first = split_indices(df, y)
        for i, a in enumerate(first):
            for b in first[i + 1:]:
                self.assertFalse(set(a) & set(b))
        reordered = split_indices(df.sample(frac=1, random_state=1), y)
        for a, b in zip(first, reordered):
            self.assertEqual(set(a), set(b))
        df.loc[1, 'caseid_new'] = df.loc[0, 'caseid_new']
        with self.assertRaises(ValueError):
            split_indices(df, y)

    def test_preprocessing_does_not_learn_test_values(self):
        train = pd.DataFrame({'w1_q9': [20, 30, np.nan, 40], 'w1_ppwork': [1, 1, 2, 2]})
        model = estimator(list(train.columns), 1).fit(train, [0, 1, 0, 1])
        prep = model.named_steps['preprocess']
        imputer = prep.named_transformers_['numeric'].named_steps['impute']
        encoder = prep.named_transformers_['categorical'].named_steps['encode']
        model.predict_proba(pd.DataFrame({'w1_q9': [9999, np.nan], 'w1_ppwork': [99, 99]}))
        self.assertEqual(imputer.statistics_[0], 30)
        np.testing.assert_equal(encoder.categories_[0], [1, 2])


if __name__ == '__main__':
    unittest.main()
