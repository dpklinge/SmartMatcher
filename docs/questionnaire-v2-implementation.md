# Questionnaire v2: first implementation

Implemented October 21, 2026, from the relationship research assessment.

Updated October 22: the next phase is documented in [relationship outcomes and measurement](relationship-outcomes-and-measurement.md). The development database has since been reset and reseeded with the user's authorization, and the unused legacy catalog/scorer have been removed. The rollout notes below describe the initial implementation.

## Included

- A shared JSON catalog with 19 preference cards and six optional behavior questions. Six core cards require completion: intent, relationship structure, existing children, future children, marriage, and availability.
- Preference answers separately record the person's answer, accepted partner answers, and an explicit firm-requirement flag. Uncertain and private answers remain unknown.
- New `v2_` identifiers preserve historical question semantics and stored answers. Old answers are not silently converted, including the ambiguous old children question.
- Mutual acceptance scoring with both people's priorities, symmetric aggregation, evidence coverage, and independent requirement eligibility. Behavioral self-reports are collected for reflection but excluded from ranking.
- Both directions of seeking and known distance limits are checked before discovery. Discovery scans the candidate pool in batches before choosing the top 20, rather than ranking an arbitrary first 50.
- Discovery, profiles, match lists, and recalculation use the same pair calculation. Old caches are not read; answer/priority writes invalidate existing entries in both directions. No schema migration is needed for this correctness-first implementation.
- Server validation rejects obsolete questionnaire versions, malformed answers, unsupported options, incomplete preferences, and invalid priorities. Partial answer saves no longer advance onboarding.
- Web and mobile onboarding, mobile preference editing, and the completed-user web editing route support the new fields. Optional cards can be skipped; mobile progress saves at category boundaries.
- The API registers current catalog entries transactionally with answer writes, so a separate seed is not needed to use v2. The explicit seed command reads the same catalog.

## Rollout behavior

Existing accounts keep their profiles, conversations, matches, and old answers. They need to answer the six current core cards before receiving new introductions. Existing matches are retained even if updated requirements differ. No users are fabricated or automatically assigned new answers. The live development database was not migrated or reseeded for this work.

Scores describe stated preference alignment. They are not calibrated probabilities of relationship success. Required incompatibilities or unknown required answers suppress new introductions independently of the soft score. Unknown optional data lowers evidence coverage. Category displays omit domains without comparable evidence.

The minimum of directional coverage is used, and discovery ranks the symmetric alignment score multiplied by coverage. The harmonic-mean aggregation and this ordering are transparent product baselines to evaluate prospectively; they are not weights established by relationship research.

## Verification

Run from the repository root:

```powershell
node --test tests/*.test.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/typescript/bin/tsc --project mobile/tsconfig.json --noEmit --incremental false
npm run build
```

The SQLite integration test creates and removes a separate temporary database. It exercises actual Prisma persistence, catalog registration, legacy-answer preservation, onboarding completion, discovery, firm requirements, match recalculation, and cache invalidation. It never uses the application's database URL.

The existing ESLint 10 / bundled React plugin combination currently crashes loading `react/display-name` with `contextOrFilename.getFilename is not a function`. This prevents a normal lint run; dependencies were not changed to work around it. Web/mobile type checks and the production build are separate checks.

Two existing type-check blockers were corrected while verifying this change: the Prisma configuration now uses the installed `migrations.seed` API, and mobile Google authentication reads the typed authentication response directly.

## Subsequent work

- Pilot the question wording, accessibility, completion burden, and optional sensitive fields with users. The behavior items are original experimental prompts, not validated psychological scales.
- Add optional validated attachment/personality instruments only after checking their terms and measurement properties. Do not automatically turn these scores into a desirability ranking.
- Add explicit consent, privacy/deletion controls, and follow-up outcomes before collecting training data or sending private answers to an external AI provider. No new external AI processing is enabled here.
- Measure formation, both partners' satisfaction, and wanted continuation separately. Compare this baseline with later models using prospective evaluation.
- Replace a full eligible-pool scan with scalable retrieval if the user population requires it, while preserving mutual eligibility and avoiding arbitrary candidate truncation.

The full research and question-by-question rationale remains in [the assessment](relationship-research-and-questionnaire-assessment.md).
