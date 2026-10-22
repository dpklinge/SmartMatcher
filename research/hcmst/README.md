# HCMST research benchmark

This is an offline feasibility benchmark, separate from the app, database and live scoring. It trains regularized logistic regressions from a public longitudinal cohort to test what existing data can tell us. It does **not** train a stranger-to-stranger compatibility model. No serialized models, individual predictions or participant identifiers are written to the app.

## Source and use conditions

Source: [Stanford HCMST 2017–2020–2022](https://data.stanford.edu/hcmst2017), small public Stata release v2.2, codebook v2.2, user guide v2.3 (March 12, 2024). Exact official download URLs and SHA-256 hashes are pinned in `benchmark.py`; a changed download fails closed. Raw data and local metrics are gitignored. Cite:

Rosenfeld, Michael J., Reuben J. Thomas, and Sonia Hausen. 2023. *How Couples Meet and Stay Together 2017–2020–2022 combined dataset.* Stanford University Libraries.

The Stanford landing page's data-use agreement, reviewed October 22, 2026, requires no attempts to identify individuals, no fee for redistribution of the data, informing the dataset contact about work using the data, and appropriate citation. It does not state an explicit commercial-use prohibition on that page. This is not a blanket determination of production model or commercial redistribution rights. Recheck current terms and institutional requirements before a production use or redistribution. This repository distributes tooling and aggregate research results, not the dataset.

The required investigator notification has been **drafted, not sent**: see `investigator-notification-draft.md`. No email authorization has been given. Complete that notification as part of satisfying the data-use agreement; it is a pending task, not a completed compliance claim.

## Reproduce

From the repository root, with Python 3.11:

```powershell
python -m pip install -r research/hcmst/requirements.txt
python research/hcmst/benchmark.py --download --write-report
python -m unittest discover -s research/hcmst -p "test_*.py"
```

Review the source terms before downloading. Omit `--download` to require already cached, verified files. `--write-report` updates the tracked aggregate `RESULTS.md`. The full aggregate output is `research-artifacts/hcmst/results.json`; raw files are in `research-data/hcmst/`. Dependencies are independent of npm and the app runtime. Pandas reports a Latin-1 fallback for source Stata text; only numeric columns are analyzed, so this warning is suppressed at read time. There is no text-model training.

## Protocol fixed for this first benchmark

- Population: baseline `w1_partnership_status` 1 (married) or 2 (partnered, unmarried). Exclude past/never partners. One row per unique, nonmissing `caseid_new`.
- Horizon: July 2017 baseline to September–October 2020 survey. This includes the pandemic and is not a uniform three-year follow-up or a lifetime survival forecast. The 2022 wave is not used here: later-wave partner identity requires a separate linking protocol.
- Primary label: breakup/divorce = 1 only when surveyed in 2020 (`w2_surveyed=1`), assigned a relationship-ended section (`w2_section` 2 or 4) and end code 1 (divorce) or 2 (separation/breakup). Continued relationship = 0 only with section 1 or 3 (explicitly same 2017 spouse/partner) **and** end code 0. Code 0 alone is not proof of continuation. Death (end code 3), nonresponse, missing or contradictory statuses are excluded.
- Secondary label: breakup as above, or a continued same relationship rated Fair/Poor/Very Poor (`w2_rel_qual_combo` 3–5) = 1; continued same relationship rated Excellent/Good (1–2) = 0. Missing quality is excluded. This is a limited respondent-reported quality proxy, not a validated happiness construct, safety outcome or mutual couple assessment.
- Split: stratified 60/20/20 train/validation/test, seed 20261022, sorted by participant ID before splitting. Each target has its own stratified split; comparisons across models are paired within target, not across targets. Unique participant IDs are asserted and never predictors. This is an internal holdout, not independent-cohort validation.
- Train-only imputation/scaling/one-hot vocabulary; negative refusal/don't-know codes become missing. Numeric median imputation has missing indicators; categorical missing has a distinct sentinel; unseen categories are ignored. Logistic C selected from 0.1/1/10 by validation Brier. No class balancing, oversampling or test-driven model selection. Candidate models are fit on training only, without refitting on validation. Prior-only dummy uses training prevalence.
- Held-out AUROC, average precision, Brier, log loss and fixed-bin calibration are recorded. Marginal AUROC/Brier 95% percentile intervals use 500 participant bootstrap samples. These are not paired significance tests, survey-design intervals or evidence of superior models across cohorts. Do not tune this protocol against the published test set; use a new external cohort for subsequent confirmation.
- Primary training/evaluation is unweighted. Test sensitivity metrics use `w2_attrition_adj_weights`, documented in the user guide. Survey weights are never input features. This sensitivity analysis does not correct every selection effect or replace survey-design inference.

## Feature manifest and app mapping

Only these fields can enter a model. Numeric refusal codes are missing, not ordinal values. Variable definitions were checked against the official guide/codebook and labeled Stata values.

| Group | Source variables | Timing / interpretation for this app |
|---|---|---|
| Profile proxies (numeric) | `w1_ppage`, `w1_q9`, `w1_subject_yrsed`, `w1_partner_yrsed` | Respondent/partner age and years of schooling, reported in 2017. Conceptually askable before a new match, but observed here **after** this relationship formed. Partner information comes from the respondent, not a partner questionnaire. |
| Profile proxies (categorical) | `w1_ppwork`, `w1_partyid7`, `w1_q12`, `w1_ppp20072` | Employment, respondent/partner political party and respondent religious attendance. Measured after formation; attendance is not the same as religious identity, desired agreement or tolerance. Employment may reflect couple history. These are benchmark inputs, not recommendations to favor a demographic or worldview. |
| Relationship context | `w1_partnership_status`, `w1_q19`, `w1_relate_duration_in2017_years` | Current marriage/partnership, cohabitation and duration. Unavailable for a prospective new pair. Duration is the relationship duration field, **not survey completion duration**. |
| Current relationship quality | `w1_q34` | Excellent=1, Good=2, Fair=3, Poor=4, Very Poor=5; treated categorically. Only available once in the relationship. Separate ablation, never presented as premeeting evidence. |

Models compare profile proxies alone, context alone, both, and both plus current quality. There is no automatic feature harvesting by prefix. All later-wave predictors, later profile updates, IDs, text, breakup dates, follow-up quality and survey weights are excluded from input. Baseline household children are not treated as desire for children. No artificial dyads or presumed mutual preferences are created.

This release cannot train the app's reciprocal acceptable-answer/firm-requirement weights. It lacks equivalent premeeting answers from both people, Mini-IPIP personality measures, the six experimental behavior scenarios, and representative outcomes for pairs who could have matched but did not. Existing-couple associations also condition on already forming and surviving a relationship. They cannot estimate whether recommending a different partner would improve outcomes.

## Decision for the app

Keep eligibility and reciprocal preference alignment as the current transparent matching method. Do not convert this benchmark into a success probability or use its coefficients as compatibility weights. The result justifies collecting **consented, premeeting baselines and later outcomes**, as implemented in the separate app research flow. Treat personality/behavior as experimental and unweighted until prospective data supports an incremental benefit.

Before learning live pair rankings, use the app's own consented pair baselines and observed outcomes, track nonresponse separately, hold out entire participants, and validate on a later cohort. Record happiness, respect/safety and continuation separately; remaining together alone is insufficient. App observations will still reflect which recommendations users saw and chose, so offline prediction alone will not establish a recommendation's causal benefit.
