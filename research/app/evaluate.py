"""Prospective app-cohort audit and offline model comparison; no live deployment."""
import argparse
import hashlib
import json
import math
import platform
import re
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

PROTOCOL = 'prospective-pair-v1'
CONSENT = '2026-10-22.1'
SEED = 20261022
MIN_CLASS = 20  # Computational reporting floor, not a power calculation.
STAGES = ['AFTER_MEETING', 'MONTH_1', 'MONTH_3', 'MONTH_6', 'MONTH_12']
OUTCOMES = ['mutual_wanted_continuation', 'both_satisfied', 'both_respected', 'both_in_relationship']
BASE = ['alignment', 'coverage']
DOMAINS = BASE + ['directional_min', 'directional_max'] + [
    f'{c}_{s}' for c in ['LIFE_GOALS', 'VALUES_AND_BELIEFS', 'LIFESTYLE'] for s in ['alignment', 'coverage']]
TRAITS = [f'trait_{i}_{s}' for i in range(5) for s in ['mean', 'difference']]
GROUPS = {'alignment': BASE, 'preference_domains': DOMAINS, 'plus_personality': DOMAINS + TRAITS}
MONTH = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')


def validate(data):
    if data.get('schemaVersion') != 2 or data.get('consentVersion') != CONSENT:
        raise ValueError('Use a fresh schema-v2 export with the current consent policy')
    pairs = data.get('pairs')
    if not isinstance(pairs, list) or data.get('includedPairs') != len(pairs):
        raise ValueError('Invalid pair count')
    seen = set()
    for pair in pairs:
        if not isinstance(pair.get('pairId'), str) or not pair['pairId'] or pair['pairId'] in seen:
            raise ValueError('Pair IDs must be unique and nonempty')
        seen.add(pair['pairId'])
        if pair.get('questionnaireVersion') != 2 or pair.get('scoringVersion') != 'mutual-preferences-v2':
            raise ValueError('Unsupported baseline measurement version')
        if not MONTH.fullmatch(pair.get('baselineMonth', '')):
            raise ValueError('Missing valid baseline cohort month')
        people = pair.get('participants', [])
        if len(people) != 2 or any(not isinstance(p.get('participantId'), str) or not p['participantId'] for p in people):
            raise ValueError('Expected two identified pseudonymous participants')
        if people[0]['participantId'] == people[1]['participantId']:
            raise ValueError('A pair cannot contain the same participant twice')
        features = pair.get('preMeetingFeatures', {})
        if set(features) != set(DOMAINS + TRAITS):
            raise ValueError('Unexpected pre-meeting feature manifest')
        for key, value in features.items():
            upper, lower = (5, 1) if key.endswith('_mean') else (4, 0) if key in TRAITS else (1, 0)
            if value is not None and (type(value) not in (int, float) or not math.isfinite(value) or not lower <= value <= upper):
                raise ValueError(f'Invalid feature value for {key}')
        for person in people:
            stages = set()
            for report in person.get('reports', []):
                if report.get('stage') not in STAGES or report['stage'] in stages:
                    raise ValueError('Invalid or repeated checkpoint for a participant')
                stages.add(report['stage'])
                if report.get('status') not in ['NOT_MET', 'GETTING_TO_KNOW', 'IN_RELATIONSHIP', 'ENDED']:
                    raise ValueError('Invalid outcome status')
                for key in ['satisfaction', 'respect']:
                    v = report.get(key)
                    if v is not None and (type(v) is not int or not 1 <= v <= 7):
                        raise ValueError('Invalid outcome rating')
                if report.get('wantsToContinue') not in [None, 'YES', 'NO', 'UNSURE']:
                    raise ValueError('Invalid continuation answer')
                if not MONTH.fullmatch(report.get('reportedMonth', '')) or report['reportedMonth'] < pair['baselineMonth']:
                    raise ValueError('Invalid outcome observation month')
    return pairs


def components(pairs):
    """Connect all exported dyads, including unlabeled ones, before selecting outcomes."""
    parent = {}

    def root(p):
        parent.setdefault(p, p)
        while parent[p] != p:
            parent[p] = parent[parent[p]]
            p = parent[p]
        return p

    for pair in pairs:
        a, b = [root(p['participantId']) for p in pair['participants']]
        parent[max(a, b)] = min(a, b)
    return {p['pairId']: root(p['participants'][0]['participantId']) for p in pairs}


def temporal_partition(pairs, groups, validation_month, test_month):
    if not (MONTH.fullmatch(validation_month or '') and MONTH.fullmatch(test_month or '') and validation_month < test_month):
        raise ValueError('Provide ordered validation/test cohort months in YYYY-MM format')
    periods = {}
    for pair in pairs:
        month = pair['baselineMonth']
        era = 'train' if month < validation_month else 'validation' if month < test_month else 'test'
        periods.setdefault(groups[pair['pairId']], set()).add(era)
    # Purge whole components that bridge periods. Never split a person's partners.
    return {pair['pairId']: next(iter(periods[groups[pair['pairId']]]))
            if len(periods[groups[pair['pairId']]]) == 1 else 'purged'
            for pair in pairs}


def reports_for(pair, stage):
    reports = [next((r for r in p['reports'] if r['stage'] == stage), None) for p in pair['participants']]
    if any(r is None for r in reports):
        return None, 'missing_partner_checkpoint'
    for report in reports:
        delay = report.get('daysAfterMeeting' if stage == 'AFTER_MEETING' else 'checkpointDelayDays')
        if type(delay) is not int or not 0 <= delay <= 30:
            return None, 'outside_checkpoint_window'
        if report['status'] == 'NOT_MET':
            return None, 'not_met_at_checkpoint'
    times = [r.get('daysAfterSnapshot') for r in reports]
    if any(type(day) is not int or day < 0 for day in times) or abs(times[0] - times[1]) > 30:
        return None, 'uncertain_or_unpaired_report_timing'
    return reports, None


def label(reports, outcome):
    # A missing partner answer never becomes a negative target, even when the
    # other partner reports a negative. Both reports are required for every target.
    if outcome == 'mutual_wanted_continuation':
        values = [r.get('wantsToContinue') for r in reports]
        return int(all(v == 'YES' for v in values)) if all(v in ['YES', 'NO'] for v in values) else None
    if outcome in ['both_satisfied', 'both_respected']:
        values = [r.get('satisfaction' if outcome == 'both_satisfied' else 'respect') for r in reports]
        return int(min(values) >= 5) if all(v is not None for v in values) else None
    return int(all(r['status'] == 'IN_RELATIONSHIP' for r in reports))


def measures(y, prediction):
    return {'auroc': float(roc_auc_score(y, prediction)),
            'average_precision': float(average_precision_score(y, prediction)),
            'brier': float(brier_score_loss(y, prediction)),
            'log_loss': float(log_loss(y, prediction, labels=[0, 1]))}


def calibration(y, p):
    bins = np.minimum((p * 10).astype(int), 9)
    return [{'bin': i, 'n': int((bins == i).sum()), 'predicted': float(p[bins == i].mean()),
             'observed': float(y[bins == i].mean())} for i in range(10) if (bins == i).any()]


def clustered_intervals(y, p, groups, reference):
    rng = np.random.default_rng(SEED)
    unique = sorted(set(groups))
    indices = {g: np.flatnonzero(groups == g) for g in unique}
    draws = []
    for _ in range(500):
        idx = np.concatenate([indices[g] for g in rng.choice(unique, size=len(unique), replace=True)])
        if len(np.unique(y[idx])) != 2:
            continue
        draws.append([roc_auc_score(y[idx], p[idx]), brier_score_loss(y[idx], p[idx]),
                      brier_score_loss(y[idx], p[idx]) - brier_score_loss(y[idx], reference[idx])])
    if len(draws) < 100:
        return {'status': 'insufficient_independent_resamples', 'valid_draws': len(draws)}
    bounds = np.quantile(draws, [.025, .975], axis=0)
    return {name: bounds[:, i].tolist() for i, name in enumerate(['auroc', 'brier', 'brier_minus_prior'])}


def fit_models(rows):
    frame = pd.DataFrame(rows)
    train, val, test = [frame[frame.split == name] for name in ['train', 'validation', 'test']]
    yt = test.y.to_numpy(dtype=int)
    reference = np.repeat(train.y.mean(), len(test))
    models = {'prior': {'test': measures(yt, reference), 'calibration': calibration(yt, reference)}}
    for name, columns in GROUPS.items():
        if name == 'plus_personality':
            complete = [sub[sub[TRAITS].notna().all(axis=1)] for sub in [train, val, test]]
            if any(min((sub.y == 0).sum(), (sub.y == 1).sum(),
                       sub.loc[sub.y == 0, 'component'].nunique(), sub.loc[sub.y == 1, 'component'].nunique()) < MIN_CLASS
                   for sub in complete):
                models[name] = {'status': 'not_estimable', 'reason': 'Insufficient complete optional personality measurements in each split'}
                continue
        candidates = []
        for strength in [.1, 1., 10.]:
            model = make_pipeline(SimpleImputer(strategy='median', add_indicator=True, keep_empty_features=True),
                                  StandardScaler(), LogisticRegression(C=strength, max_iter=2000))
            model.fit(train[columns].astype(float), train.y)
            score = brier_score_loss(val.y, model.predict_proba(val[columns].astype(float))[:, 1])
            candidates.append((score, strength, model))
        score, strength, model = min(candidates, key=lambda c: c[0])
        prediction = model.predict_proba(test[columns].astype(float))[:, 1]
        models[name] = {'C': strength, 'validation_brier': float(score), 'test': measures(yt, prediction),
                        'test_cluster_bootstrap_95': clustered_intervals(yt, prediction, test.component.to_numpy(), reference),
                        'calibration': calibration(yt, prediction),
                        'personality_complete_pairs': {s: int(sub[TRAITS].notna().all(axis=1).sum())
                                                       for s, sub in [('train', train), ('validation', val), ('test', test)]}}
    return models


def evaluate(data, stage='MONTH_3', validation_month=None, test_month=None, train=False):
    if stage not in STAGES:
        raise ValueError('Unknown checkpoint')
    pairs = validate(data)
    groups = components(pairs)
    split = temporal_partition(pairs, groups, validation_month, test_month) if validation_month or test_month else None
    result = {'protocol': PROTOCOL, 'stage': stage,
              'versions': {'python': platform.python_version(), 'sklearn': sklearn.__version__,
                           'pandas': pd.__version__, 'numpy': np.__version__},
              'feature_groups': GROUPS, 'minimum_per_class': MIN_CLASS, 'rating_threshold': 5,
              'checkpoint_window_days': 30, 'paired_report_max_gap_days': 30,
              'pair_count': len(pairs), 'component_count': len(set(groups.values())),
              'export_exclusions': data.get('excluded', {}),
              'validation_month': validation_month, 'test_month': test_month,
              'purged_pairs': sum(v == 'purged' for v in split.values()) if split else 0, 'outcomes': {},
              'limitations': ['Observed, mutually consented and confirmed-met matches only; not a formation or causal recommendation study.',
                             'Missing/nonresponse/deleted data are not failure labels.',
                             'Ratings and thresholds are experimental; individual partner reports remain separate in the input.',
                             'Internal later-time evaluation only; no production model or automated deployment.',
                             'Consent must be rechecked through a fresh export immediately before each analysis.']}
    for outcome in OUTCOMES:
        rows, reasons = [], Counter()
        for pair in pairs:
            reports, reason = reports_for(pair, stage)
            if reason:
                reasons[reason] += 1
                continue
            y = label(reports, outcome)
            if y is None:
                reasons['missing_or_uncertain_target'] += 1
                continue
            era = split[pair['pairId']] if split else 'unassigned'
            if era == 'purged':
                reasons['component_spans_time_periods'] += 1
                continue
            cutoff = validation_month if era == 'train' else test_month if era == 'validation' else None
            if cutoff and any(r['reportedMonth'] >= cutoff for r in reports):
                reasons['outcome_not_observed_before_next_period'] += 1
                continue
            rows.append({**pair['preMeetingFeatures'], 'y': y, 'split': era, 'component': groups[pair['pairId']]})
        counts = {s: {'pairs': sum(r['split'] == s for r in rows),
                      'positive': sum(r['y'] for r in rows if r['split'] == s),
                      'negative': sum(1-r['y'] for r in rows if r['split'] == s),
                      'components': len({r['component'] for r in rows if r['split'] == s}),
                      'positive_components': len({r['component'] for r in rows if r['split'] == s and r['y'] == 1}),
                      'negative_components': len({r['component'] for r in rows if r['split'] == s and r['y'] == 0})}
                  for s in ['train', 'validation', 'test', 'unassigned']}
        blockers = []
        if not split:
            blockers.append('No predeclared later-time cutoffs supplied')
        else:
            for s in ['train', 'validation', 'test']:
                if min(counts[s]['positive'], counts[s]['negative'], counts[s]['positive_components'], counts[s]['negative_components']) < MIN_CLASS:
                    blockers.append(f'{s}: need at least {MIN_CLASS} examples and independent components per class')
        entry = {'eligible_pairs': len(rows), 'excluded': dict(reasons), 'split_counts': counts,
                 'status': 'not_ready' if blockers else 'ready_for_offline_comparison', 'blockers': blockers}
        if train and not blockers:
            entry['models'] = fit_models(rows)
        result['outcomes'][outcome] = entry
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, help='Fresh private export from scripts/export-research.cjs')
    parser.add_argument('--output', required=True, help='New aggregate report path inside research-artifacts/')
    parser.add_argument('--stage', choices=STAGES, default='MONTH_3')
    parser.add_argument('--validation-month')
    parser.add_argument('--test-month')
    parser.add_argument('--train', action='store_true', help='Run comparisons only when readiness checks pass')
    args = parser.parse_args()
    destination = Path(args.output).resolve()
    allowed = Path(__file__).resolve().parents[2] / 'research-artifacts'
    if not destination.is_relative_to(allowed.resolve()):
        parser.error('Keep cohort analysis outputs inside the ignored research-artifacts directory')
    content = Path(args.input).read_bytes()
    result = evaluate(json.loads(content), args.stage, args.validation_month, args.test_month, args.train)
    result['input_sha256'] = hashlib.sha256(content).hexdigest()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open('x', encoding='utf-8') as f:
        json.dump(result, f, indent=2, allow_nan=False)
    print(f"Audited {result['pair_count']} pairs. "
          f"Trained comparisons: {sum('models' in e for e in result['outcomes'].values())}. "
          f"Report: {destination}")


if __name__ == '__main__':
    main()
