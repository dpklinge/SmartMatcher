# Prospective app-cohort evaluation

This is the next outcome-learning phase after the [external-data benchmark](../hcmst/README.md). It uses only the app's **fresh, consent-checked private exports**, never Stanford records, synthetic app accounts, or later questionnaire updates. It does not change live matching or save a deployable model.

## Run

Use Python 3.11 and the pinned Python dependencies in `../hcmst/requirements.txt`. No additional package or external AI service is required.

1. Set `RESEARCH_EXPORT_SECRET` privately to at least 32 characters; retain it between exports. Run the app exporter immediately before analysis. It checks both participants' current consent and takes a consistent database snapshot. Never train from old exports after consent withdrawal.
2. Audit readiness first:

```powershell
node scripts/export-research.cjs --output research-exports/cohort.json
python research/app/evaluate.py --input research-exports/cohort.json --output research-artifacts/app/readiness.json --stage MONTH_3
```

Create `research-exports/` before exporting. Both commands require a new output filename and refuse to replace previous files. Use new filenames for subsequent runs. Cohort analysis output is restricted to the gitignored `research-artifacts/` directory. Inputs contain sensitive pseudonymous data, not anonymous public records. Manage and delete local exports/artifacts when consent changes.

3. Before examining validation/test outcomes, choose and record calendar cutoffs in a pilot protocol. Pass `--validation-month YYYY-MM --test-month YYYY-MM` with ordered, actual months; earlier cohorts train, the middle period validates, and the later period tests. The CLI accepts these arguments rather than inventing dates for a userless app. Add `--train` to run offline model comparisons when the readiness floor is met. Without cutoffs, or without sufficient independently observed outcomes, no models train and no accuracy is reported.

Do not repeatedly choose cutoffs, endpoints or feature sets against the test results. Freeze the protocol, then confirm any selected model on a later untouched cohort before considering a product experiment.

## Export v2 and feature timing

Version 2 adds coarse baseline/observation months, relative checkpoint timing, and a fixed numeric feature manifest. Exact calendar dates, identities and contact details remain excluded. Version 1 exports must be regenerated from current consent; they cannot support the new timing checks. These are changes to an offline research format, not questionnaire answer semantics or consent scope.

All features derive from snapshots captured when the match formed, verified strictly before **both** self-reported meeting dates. Symmetric features comprise alignment/coverage, minimum/maximum directional alignment, and preference-domain alignment/coverage. Domain alignment is null when no comparable evidence exists. Optional personality features are five Mini-IPIP trait pair means and absolute differences, using the shared app scorer and correct instrument version. Invalid/missing personality is null, never zero personality. Original experimental behavior items remain excluded pending measurement/context validation.

Compare a training-prevalence reference with regularized logistic regression using (1) alignment/coverage, (2) preference-domain detail, and (3) optional personality added. Mean traits and trait differences are hypotheses to test, not established compatibility rules. Personality ablation is marked not estimable if either class has fewer than 20 complete measurements in any split. Do not interpret missing optional measurements as evidence that personality helps or hurts.

## Fixed endpoints and timing

Default checkpoint is **MONTH_3**, with explicit alternatives for first meeting and months 1/6/12. Do not pool checkpoints as independent pairs. Both participants must independently submit the chosen checkpoint. Monthly reports must be 0–30 days after their calendar checkpoint due date. First-check-in reports must be 0–30 days after meeting. The two reports must occur within 30 days of each other. These are operational pilot windows, not empirically established optimal intervals. Missing/early/late/uncertain reports are excluded and counted.

Four distinct binary endpoints are evaluated, with no global “successful relationship” label:

| Endpoint | Positive | Negative | Unknown/excluded |
|---|---|---|---|
| Mutual wanted continuation | Both say YES | Both answer YES/NO, at least one NO | Either missing/UNSURE |
| Both satisfied | Both satisfaction ratings ≥5/7 | Both rated; at least one <5 | Either rating missing |
| Both respected | Both respect ratings ≥5/7 | Both rated; at least one <5 | Either rating missing |
| Both in relationship | Both report IN_RELATIONSHIP | Both report a met status, at least one getting acquainted/ended | Either checkpoint missing, or not-met status |

The ≥5 threshold is a predeclared experimental operational definition, not a validated clinical cutoff. One person's low report cannot be concealed by averaging with a higher report. Original individual reports remain available in the private input for a separately specified analysis. A negative status outcome is not a claim that an amicable breakup is bad or that continued dating is desirable. Wanting continuation, satisfaction, respect and current relationship status remain separate.

## Participant and time separation

Build connected components over **all exported pairs**, including those with missing labels. A participant and all connected partners must remain in the same component. Components whose baseline months span train/validation/test periods are entirely purged and counted. This can leave little independent data in a dense dating network; the tool reports that honestly instead of falling back to row-random splits.

Training outcomes must have been reported before the validation period; validation outcomes before the test period. Otherwise those labels are excluded. Cohort months and observation timing determine split/eligibility only, never model inputs. These cutoffs and windows protect temporal ordering without exporting exact dates.

Each endpoint needs at least 20 examples **and** 20 distinct components in each class of each split. This is a computational reporting floor, **not a power calculation or a sufficient sample size for deployment**. Establish a sample size from pilot rates, target precision and a meaningful benefit before a product experiment. Repeated pairs within components are not treated as independent evidence.

Imputation, missing indicators and scaling fit training only. Logistic C is selected from 0.1/1/10 by validation Brier, without test selection or refitting on validation. The test report includes AUROC, average precision, Brier, log loss and fixed-bin calibration. Percentile intervals use 500 resamples of entire test components; paired Brier differences compare each model to the prevalence reference. Insufficient bootstrap variation is reported. Wide intervals or a high AUROC do not establish causality, fairness or a deployable matching policy.

## Limits and next decisions

The export includes mutually consented matched pairs with confirmed meetings and premeeting baselines. It cannot estimate formation rates among all recommendations, compatibility of people who never met, or the causal benefit of recommending a different partner. Missing reports, unmatching/deletion, opt-in and recommendation exposure create selection effects; export exclusions and endpoint exclusions are reported separately. There are no users yet, so the current real-cohort run correctly has zero eligible pairs and trains nothing.

Next external steps are a wording/accessibility/burden pilot, prospective outcome collection, and preregistration of an evaluation period. Attachment remains deferred until deployment terms and appropriate instructions are resolved. If a learned model shows a reproducible later-cohort benefit, design a separately consented randomized policy comparison with required constraints held fixed. No external AI processing or automated training/deployment is enabled here.

Tests:

```powershell
python -m unittest discover -s research/app -p "test_*.py"
```

Synthetic fixtures exist only inside unit tests to verify leakage protection and training mechanics; their metrics are never reported as app performance.
