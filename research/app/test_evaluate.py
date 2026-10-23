import copy
import unittest

from evaluate import (CONSENT, DOMAINS, TRAITS, components, evaluate, label,
                      reports_for, temporal_partition, validate)


def pair(number, month='2026-01', people=None, positive=True):
    # Synthetic unit-test fixture, never an app account or cohort.
    year, m = map(int, month.split('-'))
    offset = year * 12 + m - 1 + 3
    observation = f'{offset // 12:04}-{offset % 12 + 1:02}'
    report = {'stage': 'MONTH_3', 'status': 'IN_RELATIONSHIP' if positive else 'ENDED',
              'satisfaction': 6 if positive else 2, 'respect': 6 if positive else 2,
              'wantsToContinue': 'YES' if positive else 'NO', 'reportedMonth': observation,
              'checkpointDelayDays': 5, 'daysAfterMeeting': 100, 'daysAfterSnapshot': 101}
    return {'pairId': f'pair-{number}', 'baselineMonth': month,
            'questionnaireVersion': 2, 'scoringVersion': 'mutual-preferences-v2',
            'preMeetingFeatures': {**{key: .8 if positive else .3 for key in DOMAINS},
                                   **{key: None for key in TRAITS}},
            'participants': [{'participantId': p, 'reports': [dict(report)]}
                             for p in (people or [f'a-{number}', f'b-{number}'])]}


def dataset(pairs):
    return {'schemaVersion': 2, 'consentVersion': CONSENT, 'includedPairs': len(pairs), 'pairs': pairs, 'excluded': {}}


class EvaluationTests(unittest.TestCase):
    def test_no_users_means_no_training_or_accuracy(self):
        result = evaluate(dataset([]), train=True)
        self.assertEqual(result['pair_count'], 0)
        for target in result['outcomes'].values():
            self.assertEqual(target['status'], 'not_ready')
            self.assertNotIn('models', target)

    def test_wrong_versions_duplicates_and_leaked_features_rejected(self):
        for change in ['version', 'feature', 'duplicate_pair', 'duplicate_report', 'bad_rating']:
            data = dataset([pair(1)])
            if change == 'version': data['schemaVersion'] = 1
            if change == 'feature': data['pairs'][0]['preMeetingFeatures']['followup_satisfaction'] = 7
            if change == 'duplicate_pair': data = dataset([pair(1), pair(1)])
            if change == 'duplicate_report': data['pairs'][0]['participants'][0]['reports'] *= 2
            if change == 'bad_rating': data['pairs'][0]['participants'][0]['reports'][0]['satisfaction'] = 99
            with self.assertRaises(ValueError): validate(data)

    def test_component_bridge_is_purged_even_when_bridge_is_unlabeled(self):
        pairs = [pair(1, '2026-01', ['a', 'b']), pair(2, '2026-06', ['b', 'c']),
                 pair(3, '2026-10', ['c', 'd']), pair(4, '2026-01'),
                 pair(5, '2026-06'), pair(6, '2026-10')]
        pairs[1]['participants'][0]['reports'] = []
        groups = components(pairs)
        self.assertEqual(groups['pair-1'], groups['pair-3'])
        split = temporal_partition(pairs, groups, '2026-05', '2026-09')
        self.assertEqual([split[f'pair-{i}'] for i in range(1, 7)],
                         ['purged', 'purged', 'purged', 'train', 'validation', 'test'])
        # Reordering inputs cannot produce a different partition.
        reverse = list(reversed(pairs))
        self.assertEqual(split, temporal_partition(reverse, components(reverse), '2026-05', '2026-09'))

    def test_late_training_labels_cannot_leak_into_future(self):
        p = pair(1, '2026-01')
        p['participants'][1]['reports'][0]['reportedMonth'] = '2026-06'
        out = evaluate(dataset([p]), validation_month='2026-05', test_month='2026-09')
        for entry in out['outcomes'].values():
            self.assertEqual(entry['excluded']['outcome_not_observed_before_next_period'], 1)
            self.assertEqual(entry['eligible_pairs'], 0)

    def test_missing_uncertain_and_disagreeing_reports_are_not_averaged(self):
        p = pair(1)
        r = p['participants'][1]['reports'][0]
        r['satisfaction'] = 1
        reports, _ = reports_for(p, 'MONTH_3')
        self.assertEqual(label(reports, 'both_satisfied'), 0)
        r['wantsToContinue'] = 'UNSURE'
        self.assertIsNone(label(reports, 'mutual_wanted_continuation'))
        r['satisfaction'] = None
        self.assertIsNone(label(reports, 'both_satisfied'))
        p['participants'][1]['reports'] = []
        self.assertEqual(reports_for(p, 'MONTH_3')[1], 'missing_partner_checkpoint')

    def test_late_or_early_checkpoints_excluded(self):
        for value in [-1, 31, None]:
            p = pair(1)
            p['participants'][0]['reports'][0]['checkpointDelayDays'] = value
            self.assertEqual(reports_for(p, 'MONTH_3')[1], 'outside_checkpoint_window')

    def test_partner_reports_must_be_close_in_time(self):
        p = pair(1)
        p['participants'][0]['reports'][0]['daysAfterSnapshot'] = 150
        self.assertEqual(reports_for(p, 'MONTH_3')[1], 'uncertain_or_unpaired_report_timing')

    def test_cutoffs_are_ordered_real_months(self):
        p = [pair(1)]
        for a, b in [('2026-13', '2027-01'), ('2026-09', '2026-05'), (None, '2026-09')]:
            with self.assertRaises(ValueError): temporal_partition(p, components(p), a, b)

    def test_full_training_path_on_explicit_synthetic_fixture(self):
        pairs = [pair(f'{era}-{i}', month, positive=i % 2 == 0)
                 for era, month in enumerate(['2026-01', '2026-06', '2026-10']) for i in range(40)]
        # Leave other outcomes unknown to keep this test on a single endpoint.
        for p in pairs:
            for person in p['participants']:
                person['reports'][0].update(satisfaction=None, respect=None, wantsToContinue=None)
        data = dataset(pairs)
        before = copy.deepcopy(data)
        out = evaluate(data, validation_month='2026-05', test_month='2026-10', train=True)
        models = out['outcomes']['both_in_relationship']['models']
        self.assertEqual(models['prior']['test']['auroc'], .5)
        self.assertIn('calibration', models['alignment'])
        self.assertIn('brier_minus_prior', models['alignment']['test_cluster_bootstrap_95'])
        self.assertEqual(models['plus_personality']['status'], 'not_estimable')
        self.assertEqual(data, before)


if __name__ == '__main__':
    unittest.main()
