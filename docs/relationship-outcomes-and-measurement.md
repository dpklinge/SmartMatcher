# Relationship outcomes and optional measurement

Implemented October 22, 2026. This extends the initial questionnaire/matching work with consented measurement and evaluation infrastructure. The local development database was reset and reseeded with the current schema and 25 questionnaire cards, as authorized; it contains no accounts after setup.

## User-facing features

Both web and mobile Settings now link to:

- **Relationship check-ins:** explicit opt-in, private reports for each match, personal data export, and withdrawal/deletion. Participation does not affect ranking. A person sees only their own reports and never their partner's participation choice or answers.
- **Personality reflection:** an optional 20-item Mini-IPIP, with exact item wording, five response anchors, reverse scoring, and private 1–5 trait means. These scores are excluded from match ranking and do not diagnose anyone or represent population percentiles. Deleting the assessment also clears that person's personality copies from research baselines.

The instrument uses [the official Mini-IPIP item/scoring key](https://ipip.ori.org/MiniIPIPKey.htm). IPIP explicitly permits scientific and commercial use of its [public-domain items and scales](https://www.ipip.ori.org/newRationale.htm). This replaces the earlier BFI-2-S proposal for this first deployable optional module. Brief trait measurement remains imperfect; real-world relationship prediction still needs prospective testing. Attachment measurement has not been added without resolving the deployment terms and suitable instructions.

## Consent and timing

Current participation policy version: `2026-10-22.1`.

An opted-in person's current questionnaire, priorities, and any completed personality assessment are captured transactionally when a **new** mutual match forms. Each participant's consent is independent. Existing matches are never backfilled when someone opts in later. Re-swiping an existing match cannot silently create a later baseline.

Withdrawal disables participation and deletes that person's feedback and baselines in one transaction. A consent-preference record remains so the app can honor the choice. The other participant's independently provided records are not exposed or deleted by this operation, but the pair is excluded from future evaluation exports unless both participants currently consent. Unmatching removes the match and cascades its research records; it is not assigned a failed-relationship label.

Follow-up responses are original experimental product items, not a validated clinical relationship scale. They record:

- Whether the pair has met, is getting acquainted, is in a relationship, or stopped seeing one another.
- Self-reported first in-person meeting and relationship start dates, where applicable.
- Optional satisfaction and respect ratings, independently scored from 1–7.
- Optional desire for the connection to continue: yes, no, or unsure.

There is a first check-in plus one-, three-, six-, and twelve-month checkpoints measured from the person's reported relationship start date. The server rejects early monthly reports, impossible dates, and inconsistent not-yet-met ratings. Month arithmetic uses calendar months, clamped at month ends. Dates are stored as UTC calendar dates; same-day event ordering is not inferred. Check-ins can be updated and remain optional. No email, push, or external notification is sent.

## Evaluation tooling

`scripts/export-research.cjs` prepares a pseudonymous cohort for offline evaluation. It requires `RESEARCH_EXPORT_SECRET` of at least 32 characters and an explicit new destination file:

```powershell
node scripts/export-research.cjs --output research-exports/cohort.json
```

Create the destination directory first. Configure the secret privately, keep it stable between exports, and keep private exports out of version control. The script never overwrites an existing file. The secret is not included in the output.

The cohort includes a pair only when:

1. Both participants currently consent to the current policy.
2. Both have match-time baselines for the expected questionnaire and scoring versions.
3. Both have reported an actual meeting.
4. Both baselines strictly precede both reported meeting dates. Same-day ordering is uncertain and excluded.

The export replaces user/match identifiers with keyed pseudonyms, excludes names/contact details/exact dates, preserves null ratings, and keeps the two participants' outcome reports separate. Schema v2 additionally includes coarse baseline/report months, relative checkpoint timing, and an audited premeeting feature manifest for later-time evaluation. Regenerate older exports rather than guessing timing fields. Pseudonymized answers are still sensitive. Exclusion counts are reported; missing, withdrawn, deleted, or not-yet-met responses are never manufactured into failure labels.

This is a cohort-preparation tool, **not a trained model or an accuracy claim**. Observed matches are selected by the existing policy, and unmatching deletes records, so selection, nonresponse, and deletion can bias the sample. It cannot estimate a causal improvement in recommendation quality. The [prospective evaluation pipeline](../research/app/README.md) now groups connected participants, purges components that bridge calendar periods, embargoes outcomes not yet observed before the next period, and evaluates four separate endpoints against simple baselines. It reports readiness without training when outcomes are absent. A randomized policy comparison still requires a separate design.

Regenerate exports immediately before any future analysis or training so current consent is checked. Previously downloaded private files are outside the live database deletion transaction and must be managed/deleted by the operator; there is currently no training service or model artifact to update. Do not deploy an automated training job from stale exports without adding revocation-aware artifact management.

## Development setup and validation

An independent public-data feasibility benchmark now lives in `research/hcmst/`. Its [protocol](../research/hcmst/README.md) and [aggregate results](../research/hcmst/RESULTS.md) document source terms, pinned downloads, baseline feature allowlists, same-partner outcome checks, participant holdouts, calibration and attrition. It trains offline models for existing couples, with no app runtime dependency or live score changes. The investigator notification required by Stanford's agreement is drafted and remains unsent. These data do not contain equivalent premeeting questionnaire answers from both partners and cannot validate the app's compatibility weights.

```powershell
node scripts/setup-db.cjs
```

This loads the app's environment, synchronizes schema, regenerates Prisma, and seeds the shared questionnaire catalog. `--reset` additionally clears the configured SQLite database, and is restricted to a resolved path inside this workspace. No users are created by the seed.

Verification completed:

- 22 passing tests, including real SQLite lifecycle tests for individual consent, match-time capture, no late backfill, private access, withdrawal, and cascading deletion.
- Web and mobile TypeScript checks.
- Production Next.js build.
- An empty-development-cohort export smoke test: zero fabricated outcomes.

The existing ESLint 10 / React plugin compatibility failure remains separate from these checks. No external AI processing or learned relationship-success ranking has been enabled.
