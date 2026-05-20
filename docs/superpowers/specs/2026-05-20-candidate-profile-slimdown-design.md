# Candidate Profile Slim-Down

**Status:** Draft complete, ready for review
**Date:** 2026-05-20

## Problem

The candidate profile and the uploaded resume currently carry overlapping data:

- Resume PDF — already the authoritative document a candidate gives a hiring manager.
- Structured profile — `headline`, `bio`, `skills`, `links`, and a separate `candidate_work_history` table editable in settings.

The pre-evaluation, interview agent, and voice agent already prefer `resumeText` over the structured profile (the structured fields are used only as fallback — see `app/agents/interview.ts:332` and `app/agents/voice.ts:117`). That means:

- Candidates maintain the same data in two places.
- The settings page (`candidate-settings.tsx`, ~811 lines) is dominated by a work-history editor and a bio textarea that mostly duplicate the resume.
- Sync drift is inevitable (resume updated but profile not, or vice versa).
- AI prompts carry redundant context, costing tokens without adding signal.

The structured profile still has one real job the resume can't do well: provide a **fast-scan applicant card** for the company-facing reviewer who is skimming many applicants without opening every PDF.

## Decision

Keep only the structured fields that are useful on the scan card AND not reliably extractable from a resume:

| Field | Verdict | Reason |
|---|---|---|
| `headline` | **Keep** | One-line summary that drives applicant cards; resumes don't carry it consistently. |
| `links` (github, linkedin, portfolio) | **Keep** | High-signal, rarely on resumes, trivial for the candidate to enter. |
| `skills` (tag list) | **Keep** | Highest signal-per-pixel on a scan card; resumes make this hard to skim. |
| `bio` | **Drop** | Duplicates the resume summary; nobody updates it. |
| `workHistory` | **Drop** | Fully covered by the resume PDF, which is one click away. Owns the most candidate friction and engineering surface. |

Resume remains the canonical source for evaluation. Structured profile becomes a minimal, scannable companion: name + headline + skill tags + links + "View Resume" button.

## Migration Posture

The app is **not live**. No backward compatibility, no data preservation, no historical snapshot handling. Drop the columns, drop the table, drop the JSONB fields wherever they appear, drop the seed data, drop the tests. Treat it as a clean removal.

## Scope of Change

### Database

- `candidate_profiles`: drop column `bio`.
  - Keep: `headline`, `skills` (JSONB), `links` (JSONB), `resume_key`, `resume_updated_at`.
- Drop entire table `candidate_work_history` (including FKs, indexes, and the `candidate_profile_id` reference).
- Project uses a single init migration (per AGENTS.md). Edit the init migration in place so a fresh DB never has these columns/table; do **not** add a follow-up migration. Include `-- migrate:down` with empty body.
- Regenerate `db/schema.sql` via the standard dump.

### Application Snapshot

- `applications.metadata` JSONB shape changes: stop writing `bio` and `workHistory` at apply time. The snapshot builder lives in `app/features/applications/server/functions.ts` (or wherever apply is implemented) — update the schema it serializes.
- No need to handle historical snapshots — none exist in production.

### Seed Data

- `db/seed/candidate-profiles.ts`: remove bio + work-history seeding entirely.
- `db/seed/seed-me.ts`: same.
- `seed.ts` (root): remove any references.

### UI

- **`candidate-settings.tsx`** (~811 lines): remove the bio textarea section and the entire work-history editor (rows, dates, descriptions, sort_order handling, add/remove handlers, related queries and mutations). Expected delta: ~400 lines removed.
- **`onboarding/candidate.tsx`**: if onboarding collects any of the dropped fields, remove them. Final shape: name + headline + links + resume upload.
- **`submitted-profile-snapshot.tsx`**: drop the bio paragraph section and the work-history list section. Keep headline, skills tags, links, and the "View Resume" affordance. Remove the `bio` and `workHistory` props from the component's interface entirely (no optional-prop limbo).
- **`applicants/$applicationId.tsx`**: stop reading `bio` / `workHistory` from snapshot metadata; remove the related types and prop wiring.
- **`application/$applicationId.tsx`** (candidate-side view of their own submitted snapshot): same treatment.

### AI Layer

- **`app/shared/ai-candidate-profile.ts`**: shrink `candidateProfileSnapshotSchema`, `buildCandidateProfilePromptPayload`, and `buildCandidateProfileSummary` to only emit `headline`, `skills`, `links`. Remove `workHistoryEntrySchema` and `workHistorySchema` entirely. Remove `bio` from the schema.
- **`app/workflows/pre-evaluation/steps.ts`**: structured-profile payload to the LLM becomes smaller. Resume text remains the primary content. Bump `prompt_version` since the input shape changes.
- **`app/workflows/post-evaluation/steps.ts`**: audit and remove any references to `bio` / `workHistory` from candidate-context construction. The post-eval must still receive `headline`, `skills`, `links`, and the transcript/voice analysis as before. If post-eval bakes profile context into the report prompt, bump `prompt_version` there too.
- **`app/agents/interview.ts`** and **`app/agents/voice.ts`**: already prefer `resumeText` and call `buildCandidateProfileSummary` as fallback — that helper now returns less. No additional agent code change required beyond what flows from `ai-candidate-profile.ts`.

### Applications Workflows

- **`app/features/applications/services/workflows.ts`**: audit for snapshot construction, profile-metadata payload, or any explicit references to `bio` / `workHistory`. Remove them.

### Server Functions

- **`app/features/candidates/server/functions.ts`**: remove input schemas, server functions, and any references that handle `bio` updates or `workHistory` CRUD. Settings page mutations shrink accordingly.

### Queries / Generated SQL

- `app/features/candidates/queries/queries.sql`: remove queries that touch `candidate_work_history` and remove `bio` from candidate-profile inserts/updates/selects.
- Re-run `bun run sqlgen` to refresh `queries_sql.ts`.

### Tests

- `app/shared/__tests__/ai-candidate-profile.test.ts`: drop work-history / bio cases. Verify the smaller payload shape.
- `app/workflows/pre-evaluation/__tests__/steps.test.ts`: update fixtures that include `bio`, `workHistory` for the structured payload assertion (skills stays).
- `app/features/candidates/queries/__tests__/candidates.test.ts`: drop tests for `candidate_work_history` queries and `bio` column. Update remaining tests to match new candidate-profile shape.
- `app/features/applications/__tests__/business-logic.test.ts` and `app/features/applications/__tests__/notification-workflows.test.ts`: update snapshot fixtures.
- `app/shared/__tests__/test-utils.ts`: update `seedUser` / candidate seeding helpers to drop bio + workHistory.

## Non-Goals

- Not introducing LLM extraction from the resume to populate the structured fields. Candidate enters headline, skills, links directly.
- Not changing how the resume is uploaded, stored, or rendered.
- Not adding a public candidate profile page (none exists today).
- Not changing the company-side workflow or applicant statuses.
- Not changing `links` storage format.
- Not preserving historical data — app is pre-launch.

## Validation

After implementation:

- `bun run check` (lint + typecheck) passes with zero references to dropped fields anywhere in the codebase.
- `bun run test` passes.
- `bash setup-db.sh reset_pg` followed by a fresh `bun run setup.ts` produces a DB without `candidate_profiles.bio` and without the `candidate_work_history` table.
- Manual: candidate signs up via onboarding → only name/headline/links/resume requested. Settings page renders without bio/workHistory sections.
- Manual: company opens an applicant detail page → snapshot card shows headline + skills + links + "View Resume" button.
- Manual end-to-end: apply → pre-eval runs and produces a score → interview → post-eval → report renders. No broken refs to removed fields.

## Acceptance

`rg "bio|workHistory|work_history|candidate_work_history" app db seed.ts` returns no results outside this design doc.

## Rollout Notes

- This is a pre-launch schema/product simplification, not a migration strategy exercise.
- No feature flag needed.
- No data backfill needed.
- No compatibility adapter layer needed.

## Open Questions

None.
