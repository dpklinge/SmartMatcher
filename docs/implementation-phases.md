# Relationship matching implementation phases

Updated October 22, 2026. This tracks the implementation order in the [research assessment](relationship-research-and-questionnaire-assessment.md), distinguishing completed infrastructure from studies that need real participants.

| Phase | Implemented | Remaining evidence or external work |
|---|---|---|
| 1. Measurement correctness | Versioned shared catalog, typed answers, server validation, normalization, private/unknown semantics, bidirectional cache invalidation, required completion checks | Real wording/accessibility pilot |
| 2. Mutual compatibility | Reciprocal requirements and seeking/distance checks, accepted partner answers, separate parenting fields, symmetric alignment and evidence coverage | Prospective comparison of transparent ranking baselines |
| 3. Question quality | Original experimental behavior prompts; behavior/personality excluded from live ranking; hobbies do not drive compatibility | Pilot interpretation, burden, recall/context and incremental predictive usefulness |
| 4. Optional measurement | Private public-domain Mini-IPIP with exact scoring, deletion and match-time research snapshots | Pilot completion/retest properties; attachment deferred pending deployment terms and appropriate instructions |
| 5a. Outcome collection | Independent opt-in, private checkpoint reports, individual export/withdrawal/deletion, strict premeeting cohort export | Consented real users and follow-up responses |
| 5b. External-data feasibility | Pinned Stanford HCMST downloads, existing-couple baseline models, holdout metrics and documented limitations | Investigator notification drafted but unsent; no claim of premeeting dyad validation |
| 5c. App-cohort evaluation | Schema-v2 export, audited symmetric features, participant-component/time-separated evaluation, separate satisfaction/respect/continuation/status endpoints, readiness checks and optional personality ablation | No users/outcomes yet: zero models trained on app data, no app prediction accuracy claimed |
| 5d. Prospective policy validation | Protocol requirements documented; existing mutual eligibility remains enforced | Freeze study endpoints/time cutoffs, estimate sample size from pilot rates, collect later cohorts, and design a consented policy comparison if offline gains warrant it |

## Current real-cohort check

Ran the actual empty development cohort through export and the evaluator with `--train`. It exported zero eligible pairs, reported each endpoint as not ready, and trained zero models. The private local report is `research-artifacts/app/phase5-readiness.json`. No synthetic users, ratings or relationship outcomes were added to the database.

## Pilot sequence

1. Recruit an explicitly consenting pilot and observe wording comprehension, screen-reader/keyboard usability, time to complete, skipped/private answers and perceived pressure to disclose. Collect these observations before choosing a completion-time threshold; do not label optional answers as failures.
2. Check whether participants distinguish their own situation, acceptable partner answers and firm requirements. Include flexible parenting, uncertainty, private information, mixed faith, nonsexual relationships and reciprocal distance scenarios.
3. Keep optional personality separate. Ask whether its reflection is understandable and whether the additional burden is acceptable. Experimental behavior items need context/reliability work before training use. Attachment has not been substituted with an unlicensed or improvised instrument.
4. Collect individual outcome reports without exposing partner participation or answers. Review missingness, contradictory dates, late check-ins and disagreement between partners. Do not infer outcomes from message counts or deletion/unmatching.
5. Freeze a prospective evaluation protocol, actual calendar boundaries and a meaningful benefit before examining held-out results. The evaluator's computational floor is not a study power calculation. Run an untouched later cohort after model selection.

No trained success score is deployed, no private answers are sent to external AI, and no emails have been sent. The live score remains transparent reciprocal preference alignment, with eligibility and coverage separate. The [app evaluation protocol](../research/app/README.md) specifies the executable next phase once real outcomes exist.
