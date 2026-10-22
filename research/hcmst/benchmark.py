"""Offline existing-couple benchmark. Never imported by the matchmaking app."""
import argparse
import hashlib
import json
import platform
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import requests
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, log_loss, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'research-data/hcmst'
OUT = ROOT / 'research-artifacts/hcmst'
SEED = 20261022
SOURCES = {
    'hcmst-2017-2022-v2.2.dta': (
        'https://stacks.stanford.edu/file/druid%3Ahg921sg6829/HCMST%202017%20to%202022%20small%20public%20version%202.2.dta',
        'a76c1ef8e14a69951db3d71142dfb3866063c7af8d0da67942b744e2727aeb56'),
    'guide.pdf': (
        'https://stacks.stanford.edu/file/druid%3Atq903pj6286/HCMST%202017-%202022%20user%27s%20guide%20v2.3.pdf',
        'ffe66c3c23d917cd494c3378a7c89265e12d0a57dc34d85b6ec459f1b66f784a'),
    'codebook.pdf': (
        'https://stacks.stanford.edu/file/druid%3Ahg921sg6829/HCMST%202017%20to%202022%20v2.2%20codebook.pdf',
        'ed8f9ef9f8349277ac42e973092856d348e97f190c60402b925f5a480134bea4'),
}
# Explicit allowlist: no automatic selection by prefix, IDs, weights, or later waves.
NUMERIC = ['w1_ppage', 'w1_q9', 'w1_subject_yrsed', 'w1_partner_yrsed']
CATEGORICAL = ['w1_ppwork', 'w1_partyid7', 'w1_q12', 'w1_ppp20072']
CONTEXT = ['w1_partnership_status', 'w1_q19', 'w1_relate_duration_in2017_years']
GROUPS = {
    'profile_proxies': NUMERIC + CATEGORICAL,
    'relationship_context': CONTEXT,
    'profile_and_context': NUMERIC + CATEGORICAL + CONTEXT,
    'plus_current_quality': NUMERIC + CATEGORICAL + CONTEXT + ['w1_q34'],
}
ALLOWED = frozenset(NUMERIC + CATEGORICAL + CONTEXT + ['w1_q34'])
NUMERIC_FIELDS = frozenset(NUMERIC + ['w1_relate_duration_in2017_years'])


def acquire(download=False):
    DATA.mkdir(parents=True, exist_ok=True)
    for name, (url, expected) in SOURCES.items():
        path = DATA / name
        if not path.exists():
            if not download:
                raise FileNotFoundError(f'{path}: run with --download after reviewing README terms')
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            content = response.content
        else:
            content = path.read_bytes()
        if hashlib.sha256(content).hexdigest() != expected:
            raise ValueError(f'Source changed: {name}; review version before updating hashes')
        if not path.exists():
            path.write_bytes(content)
    return DATA / 'hcmst-2017-2022-v2.2.dta'


def targets(df):
    """NaN means unknown/excluded, never success or failure by default."""
    current = df.w1_partnership_status.isin([1, 2])
    surveyed = df.w2_surveyed.eq(1)
    continuing = (current & surveyed & df.w2_section.isin([1, 3])
                  & df.w2_relationship_end.eq(0))
    ended = (current & surveyed & df.w2_section.isin([2, 4])
             & df.w2_relationship_end.isin([1, 2]))
    breakup = pd.Series(np.nan, index=df.index)
    breakup.loc[continuing] = 0
    breakup.loc[ended] = 1
    # A deliberately narrow respondent-rated quality proxy, not validated happiness.
    adverse = pd.Series(np.nan, index=df.index)
    adverse.loc[ended] = 1
    quality_known = continuing & df.w2_rel_qual_combo.isin([1, 2, 3, 4, 5])
    adverse.loc[quality_known] = df.loc[quality_known, 'w2_rel_qual_combo'].ge(3).astype(int)
    return {'breakup': breakup, 'ended_or_fair_poor_quality': adverse}


def split_indices(df, y):
    if df.caseid_new.isna().any() or not df.caseid_new.is_unique:
        raise ValueError('Expected exactly one baseline row per participant')
    # Canonical participant order makes row reordering immaterial.
    indices = df.loc[y.notna()].sort_values('caseid_new').index
    train, holdout = train_test_split(indices, test_size=.4, random_state=SEED,
                                     stratify=y.loc[indices])
    validation, test = train_test_split(holdout, test_size=.5, random_state=SEED,
                                       stratify=y.loc[holdout])
    return train, validation, test


def features(df, columns):
    if not set(columns) <= ALLOWED:
        raise ValueError('Feature outside audited baseline allowlist')
    # Stata -1/-2 refusal/don't-know codes must not become substantive values.
    return df[columns].astype(float).mask(lambda x: x < 0)


def estimator(columns, strength):
    numeric = [c for c in columns if c in NUMERIC_FIELDS]
    categorical = [c for c in columns if c not in NUMERIC_FIELDS]
    prep = ColumnTransformer([
        ('numeric', Pipeline([
            ('impute', SimpleImputer(strategy='median', add_indicator=True, keep_empty_features=True)),
            ('scale', StandardScaler()),
        ]), numeric),
        ('categorical', Pipeline([
            ('impute', SimpleImputer(strategy='constant', fill_value=-999, keep_empty_features=True)),
            ('encode', OneHotEncoder(handle_unknown='ignore')),
        ]), categorical),
    ])
    return Pipeline([('preprocess', prep), ('model', LogisticRegression(C=strength, max_iter=2000))])


def metrics(y, prediction, weights=None):
    return {
        'auroc': float(roc_auc_score(y, prediction, sample_weight=weights)),
        'average_precision': float(average_precision_score(y, prediction, sample_weight=weights)),
        'brier': float(brier_score_loss(y, prediction, sample_weight=weights)),
        'log_loss': float(log_loss(y, prediction, sample_weight=weights, labels=[0, 1])),
    }


def intervals(y, prediction, draws=500):
    rng = np.random.default_rng(SEED)
    samples = []
    for _ in range(draws):
        idx = rng.integers(0, len(y), len(y))
        if len(np.unique(y[idx])) == 2:
            samples.append([roc_auc_score(y[idx], prediction[idx]),
                            brier_score_loss(y[idx], prediction[idx])])
    bounds = np.quantile(samples, [.025, .975], axis=0)
    return {name: bounds[:, i].tolist() for i, name in enumerate(['auroc', 'brier'])}


def calibration(y, prediction):
    # Fixed probability bins; counts make sparse-bin uncertainty visible.
    bins = np.minimum((prediction * 10).astype(int), 9)
    return [{'bin': i, 'n': int((bins == i).sum()),
             'mean_prediction': float(prediction[bins == i].mean()),
             'observed_rate': float(y[bins == i].mean())}
            for i in range(10) if (bins == i).any()]


def run(df):
    current = df.w1_partnership_status.isin([1, 2])
    result = {
        'seed': SEED, 'versions': {'python': platform.python_version(), 'pandas': pd.__version__,
                                 'numpy': np.__version__, 'sklearn': sklearn.__version__},
        'sources': {n: {'url': u, 'sha256': h} for n, (u, h) in SOURCES.items()},
        'flow': {'all_baseline': len(df), 'currently_partnered_2017': int(current.sum()),
                 'current_no_2020_response': int((current & df.w2_surveyed.ne(1)).sum()),
                 'current_partner_death': int((current & df.w2_relationship_end.eq(3)).sum())},
        'features': GROUPS, 'targets': {},
    }
    for name, y in targets(df).items():
        train, validation, test = split_indices(df, y)
        yt = y.loc[test].to_numpy(dtype=int)
        entry = {'eligible': int(y.notna().sum()), 'events': int(y.sum()),
                 'excluded_current': int((current & y.isna()).sum()),
                 'splits': {k: {'n': len(idx), 'events': int(y.loc[idx].sum())}
                            for k, idx in [('train', train), ('validation', validation), ('test', test)]},
                 'models': {}}
        dummy = DummyClassifier(strategy='prior').fit(np.zeros((len(train), 1)), y.loc[train])
        predictions = {'prior': dummy.predict_proba(np.zeros((len(test), 1)))[:, 1]}
        for group, columns in GROUPS.items():
            x = features(df, columns)
            candidates = []
            for strength in [.1, 1., 10.]:
                model = estimator(columns, strength).fit(x.loc[train], y.loc[train])
                loss = brier_score_loss(y.loc[validation], model.predict_proba(x.loc[validation])[:, 1])
                candidates.append((loss, strength, model))
            loss, strength, chosen = min(candidates, key=lambda item: item[0])
            predictions[group] = chosen.predict_proba(x.loc[test])[:, 1]
            entry['models'][group] = {'C': strength, 'validation_brier': float(loss)}
        weights = df.loc[test, 'w2_attrition_adj_weights'].to_numpy(dtype=float)
        if not np.all(np.isfinite(weights) & (weights > 0)):
            raise ValueError('Invalid evaluation weights')
        for model_name, prediction in predictions.items():
            entry['models'].setdefault(model_name, {}).update({
                'test': metrics(yt, prediction), 'test_bootstrap_95': intervals(yt, prediction),
                'weighted_test_sensitivity': metrics(yt, prediction, weights),
                'calibration': calibration(yt, prediction),
            })
        result['targets'][name] = entry
    return result


def report(result):
    lines = ['# HCMST offline benchmark results', '',
             'Generated by `python research/hcmst/benchmark.py`. See [protocol and limits](README.md).', '',
             'These are predictions about existing 2017 relationships at the 2020 follow-up. '
             'They do not validate matching strangers or measure causal compatibility.', '',
             'Cohort flow: ' + '; '.join(f'{k}: {v}' for k, v in result['flow'].items()) + '.', '']
    for target, entry in result['targets'].items():
        lines += [f'## {target}', '',
                  f"Eligible: {entry['eligible']}; events: {entry['events']}; splits: "
                  + ', '.join(f"{k} {v['n']} ({v['events']} events)" for k,v in entry['splits'].items()) + '.', '',
                  '| Model | Test AUROC (95% bootstrap) | Average precision | Brier | Weighted AUROC |',
                  '|---|---:|---:|---:|---:|']
        for name, values in entry['models'].items():
            m, ci = values['test'], values['test_bootstrap_95']['auroc']
            lines.append(f"| {name} | {m['auroc']:.3f} ({ci[0]:.3f}–{ci[1]:.3f}) | "
                         f"{m['average_precision']:.3f} | {m['brier']:.3f} | "
                         f"{values['weighted_test_sensitivity']['auroc']:.3f} |")
        lines += ['']
    lines += ['## Interpretation', '',
              'For breakup, the test AUROC is 0.737 for profile proxies, 0.907 for existing-relationship '
              'context, and 0.930 when current quality is also available. These models address '
              'continuation of established couples, not the benefit of recommending a new pair. '
              'Only 37 breakup events occur in the test split; uncertainty is material and no paired '
              'significance claim is made. The profile model also includes ages and employment, '
              'so its performance cannot be attributed to shared values or similarity.', '',
              'Of 2,862 currently partnered baseline participants, 1,146 have no 2020 response, '
              '41 report partner death, and 4 have inconsistent/uncertain end status. These 1,191 '
              'participants are excluded from both targets. None are imputed as relationship failures. '
              'This substantial attrition and the pandemic horizon limit transfer to new app users.', '',
              'Higher AUROC/AP and lower Brier are better. The prior model provides a base-rate reference. '
              'Bootstrap intervals resample test participants (500 draws); they are not survey-design confidence intervals. '
              'Weighted metrics use Stanford’s 2020 attrition-adjusted weights as a sensitivity check; '
              'training and selection are unweighted. Results do not eliminate nonresponse bias.', '',
              'Full metrics, calibration bins, selected regularization, source hashes and environment versions: '
              '`research-artifacts/hcmst/results.json` (local, ignored). '
              'No model or participant predictions are exported to the application.', '']
    return '\n'.join(lines)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true', help='Download missing official, hash-pinned sources')
    parser.add_argument('--write-report', action='store_true', help='Update tracked aggregate RESULTS.md')
    args = parser.parse_args()
    source = acquire(args.download)
    # Public Stata text triggers a Latin-1 fallback warning in pandas. Only numeric
    # values are used, with audited labels in the protocol; no text encoding inference.
    with warnings.catch_warnings():
        warnings.filterwarnings('ignore', category=UnicodeWarning)
        frame = pd.read_stata(source, convert_categoricals=False)
    output = run(frame)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'results.json').write_text(json.dumps(output, indent=2, allow_nan=False), encoding='utf-8')
    markdown = report(output)
    if args.write_report:
        (Path(__file__).parent / 'RESULTS.md').write_text(markdown, encoding='utf-8')
    print(markdown)
