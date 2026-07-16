# Batch Quota Correctness and Report Delivery Plan

**Date:** 2026-07-14  
**Status:** Implemented and verified
**Scope owner:** Batch orchestration, pre-evaluation allocation, post-evaluation persistence, job target editing, and company report-progress UI

## Problem

`jobs.final_report_target` is intended to cap how many reports a company receives for a job. The current workflow does not enforce that invariant at the point where report-producing work is created:

- Pre-evaluation counts only released reports and `pending | in_progress` interviews. It ignores queued candidates, `awaiting_voice`, completed post-evaluations, and held reports.
- Batch launch sizes from the job's original target instead of its remaining capacity.
- Batch launch does not lock the job, so concurrent launch calls can create overlapping active batches, duplicate interviews, and duplicate notifications.
- Backfill can launch queued candidates after the target has already been reached.
- A batch can be released before all reports are persisted. A report persisted after that release remains held because batch release is idempotently skipped.
- The pool timeout uses application creation time from a score-ordered row, not the time the oldest candidate entered the pool.
- Companies cannot tell the difference between delivered reports, reports being generated, unfinished interviews, and waitlisted candidates.
- Job edits can decrease `final_report_target`, invalidating existing report commitments.

The production batch-size override is outside this plan. It will be reverted separately. The correctness changes in this plan must work for every configured batch size.

## Product Decisions

1. `final_report_target` is the total report cap for the job, not necessarily one batch's size.
2. A batch invites at most `min(remaining capacity, configured batch size, pool size)` candidates.
3. Qualified candidates can remain `queued_for_batch` as a waitlist while all current slots are reserved. Waitlisted candidates do not consume report capacity.
4. Existing invitations are honored. No interview is cancelled merely because the company edits the job.
5. A company can increase `final_report_target`, subject to plan entitlement, but can never decrease it.
6. A batch releases reports available at its 12-hour deadline. Reports finishing after that release become visible immediately and still consume their previously reserved slot.
7. `pending` and `in_progress` interviews expire when due. `awaiting_voice` does not expire at batch release and continues reserving capacity until completion, cancellation, or withdrawal.
8. There is no compatibility requirement for legacy quota behavior or disposable evaluation data. Migrations must nevertheless remain non-destructive and must not silently delete production rows.
9. Once delivered reports equal the target, newly evaluated candidates receive the existing `position_filled` outcome. Candidates already waitlisted remain queued and become eligible if the target later increases.
10. A completed interview is a committed report. Candidate withdrawal can cancel unfinished interview work, but cannot cancel report production after the interview has completed.

## Core Invariants

### Capacity vocabulary

- **Delivered:** an application has a report with `released_at IS NOT NULL`.
- **Reserved:** an application has an interview in `pending`, `in_progress`, `awaiting_voice`, or `completed`, and does not yet have a released report. A completed interview remains reserved while post-evaluation is running or its report is held.
- **Waitlisted:** the application status is `queued_for_batch`. It does not reserve capacity and has not been promised an interview.
- **Available capacity:** `max(0, final_report_target - delivered - reserved)`.

Counts are per distinct application. A completed interview with an unreleased report is one reservation, not an interview plus a report. Converting a held report to a released report moves one unit from reserved to delivered without changing total consumed capacity.

### Required invariants

1. `delivered + reserved <= final_report_target` after every committed transaction.
2. At most one `forming | active` batch exists for a job.
3. An application has at most one interview record.
4. Every operation that converts waitlisted candidates into reserved interviews locks the job row and calculates capacity after acquiring that lock.
5. A released batch can never strand a subsequently created report in `evaluated_held`.
6. A target update satisfies `new_target >= current_target` at the database transaction boundary.
7. A transition that frees capacity is conditional on the interview still being in a cancellable/expirable state, so stale writes cannot free a slot that later produces a report.
8. Notification creation is idempotent by a stable domain-event key; email delivery is at least once unless the provider supports an idempotency key.

## State Flow

```diagram
qualified application
        │
        ▼
 queued_for_batch ──────────────── waitlist; consumes no capacity
        │
        │ job lock + available capacity
        ▼
 pending → in_progress → awaiting_voice → completed
    ╰──────────────────── reserved capacity ─────────╯
                                               │
                                               ▼
                                      post-evaluation report
                                               │
                         ╭─────────────────────┴────────────────────╮
                         │ batch not released                      │ batch released
                         ▼                                         ▼
                 evaluated_held                         evaluated + released report
                         │
                         │ batch release
                         ▼
                 evaluated + released report
```

Expired and cancelled interviews stop reserving capacity. A withdrawal frees capacity only when its unfinished interview is atomically cancelled. A released report remains delivered regardless of later company actions on the application.

## Phase 1: Database Invariants and Queue Time

Create a new dbmate migration. Do not edit an applied migration or `db/schema.sql` by hand.

### Schema changes

1. Add nullable `applications.queued_at TIMESTAMPTZ`.
2. Add a unique index on `interviews(application_id)`.
3. Add a partial unique index on `job_batches(job_id)` where `status IN ('forming', 'active')`.
4. Add nullable `notifications.dedupe_key TEXT` and a partial unique index on `(user_id, type, dedupe_key)` where `dedupe_key IS NOT NULL`.

Backfill `queued_at = updated_at` for existing `queued_for_batch` applications. Leave it null for every other status. Before applying constraints outside a disposable local database, run explicit preflight queries for:

- duplicate interviews per application;
- multiple forming/active batches per job;
- queued applications that already have interviews;
- `delivered + reserved > final_report_target`;
- queued applications still missing `queued_at` after backfill.

The migration must fail on conflicts rather than deleting, cancelling, or choosing records automatically. Resolve a pre-existing over-cap job by an explicit environment reset or by increasing its target before deployment; do not encode destructive repair in the migration.

After creating the migration:

1. Run `bunx dbmate up`.
2. Run `bun run sqlgen` after the SQL query changes described below.
3. Never edit generated `*_sql.ts` files directly.

### Queue timestamp semantics

Update the source application-status SQL in `app/features/applications/queries/queries.sql`:

- entering `queued_for_batch` sets `queued_at = now()`;
- leaving `queued_for_batch` clears `queued_at`;
- updating an application already in `queued_for_batch` must not reset its queue age.

Apply the same semantics to every raw application-status update, including batch invitation. Do not rely only on the generic status helper. If a database check constraint is added, it must enforce both directions: queued status requires a non-null timestamp, and every non-queued status requires null.

Update the pool query in `app/features/batches/queries/queries.sql` to return `queued_at`. Pool priority remains pre-evaluation score descending, then queue age. Launch timeout is calculated from `MIN(queued_at)` across the full pool, independently of invitation priority. Do not use `pool[0]` to infer the oldest candidate.

## Phase 2: One Authoritative Capacity Model

Add source SQL queries, preferably under `app/features/batches/queries/queries.sql`, for:

1. Locking and reading the job's `final_report_target` with `FOR UPDATE`.
2. Reading the per-job delivered and reserved counts defined above.
3. Reading company-facing delivered, processing, underway, and waitlisted progress counts.

The capacity query must count distinct applications and avoid double counting a completed interview that already has a report. A released report counts as delivered and excludes its interview from reserved. Interview statuses `expired` and `cancelled` do not reserve capacity.

Do not introduce a reservation table or denormalized `consumes_slot` flag. The interview/report lifecycle is the source of truth.

### Pre-evaluation admission

Refactor the quota section in `app/workflows/pre-evaluation/steps.ts`:

1. Lock the job row as it does today.
2. Preserve the existing idempotency check for an existing interview.
3. Count delivered reports under the lock.
4. If delivered reports have reached the target, return `quota_exhausted` and send the existing `position_filled` notification.
5. Otherwise transition every qualified application to `queued_for_batch`, even when current reservations occupy all available capacity.
6. Trigger `checkAndLaunchBatch()` after commit as today.

Pre-evaluation does not reserve report capacity. Batch launch is the only automatic path that converts a waitlisted application into a reservation.

Every pre-evaluation application transition must be conditional on its expected source status. Lock and re-read the application before queueing it; if it has been rejected, withdrawn, or otherwise advanced concurrently, stop without overwriting the newer state. Add the equivalent guard to the earlier `pre_screening` write in the workflow.

Audit manual interview-invite and recovery paths. Any path that creates or reactivates a report-producing interview must use the same job lock and capacity calculation rather than bypassing the invariant.

### One-interview recovery matrix

The unique interview index changes the existing expired-interview reinvite path, which currently creates another interview row. Replace that behavior explicitly:

| Existing state | Recovery behavior |
|---|---|
| No interview | Create one under the job lock when capacity exists. |
| `expired` or `cancelled`, no report, application otherwise eligible | Reset the existing interview row to a clean `pending` attempt; clear its batch, timestamps, runtime metadata, messages, and communication/voice attempt data using one canonical reset service. |
| `completed`, no report | Retry/reconcile post-evaluation; never create or reset an interview. The slot remains reserved. |
| Any released or unreleased report | Never reinvite; reconcile report/application visibility instead. |

Do not reset a cancelled interview belonging to a withdrawn application. Update the established notification-workflow reinvite tests before adding the unique index.

### Global lock order

Use one lock order throughout the implementation:

- entitlement-aware job update: company entitlement scope → job;
- queueing/manual admission/batch launch: job → selected application rows → interview;
- batch release/report persistence/timeout: batch → application → interview;
- withdrawal/cancellation without a batch operation: application → interview;
- never acquire a job lock while holding a batch lock;
- invoke backfill only after the state-changing transaction commits.

Batch launch must conditionally claim selected rows from `queued_for_batch` while they are locked. Pre-evaluation, company rejection, and withdrawal must also lock/re-read the application so launch cannot resurrect a candidate whose status changed after the pool read.

## Phase 3: Atomic Batch Launch and Backfill

Refactor `checkAndLaunchBatch()` in `app/features/batches/server/orchestration.ts` so its transaction performs these steps in order:

1. Lock the job row with `FOR UPDATE`, read its target, and verify the job is open, unarchived, and unexpired. Existing interviews remain honored when a job later closes, but no new batch launches.
2. Check for an existing `forming | active` batch while still holding the job lock.
3. Read delivered and reserved counts.
4. Compute available capacity. Return without launching when it is zero.
5. Read the waitlisted pool and its oldest `queued_at`.
6. Set `targetSize = min(available capacity, BATCH_CONFIG.DEFAULT_TARGET_SIZE)`.
7. Apply launch thresholds against this remaining-capacity target:
   - launch immediately when `pool.length >= targetSize`;
   - otherwise launch a configured minimum partial batch after the formation timeout;
   - otherwise launch at least one candidate after the hard timeout.
8. Set `inviteCount = min(pool.length, available capacity, BATCH_CONFIG.DEFAULT_TARGET_SIZE)`.
9. Lock and conditionally claim the selected application rows, then create the batch, interviews, assignments, application transitions, and notification rows in the same transaction.
10. Activate the batch and commit before dispatching email.

The job lock serializes post-evaluation admissions, periodic pool checks, release-triggered backfills, and concurrent background launch calls for the same job. The partial unique index is a database backstop, not the primary control flow.

Do not silently continue if an interview cannot be created or assigned. Throw so the entire transaction rolls back; otherwise an application can become `interview_invited` without a valid interview. A queued application with an existing interview is an invariant violation and should not be selected by the pool query.

Create invite notifications with `dedupe_key = interview:<interviewId>`. A retry or concurrent caller must load/reuse the existing notification instead of inserting another row.

Move `env.BATCH_ORCHESTRATION.create()` outside the SQL transaction. After commit, idempotently create the workflow using the batch ID. If startup fails, leave the batch repairable: periodic pool checks that find an active batch must ensure its orchestration instance exists or restart it rather than only returning `Batch already forming`. Add a failure/reconciliation test.

### Backfill

Change `maybeLaunchNextBatch()` to delegate directly to `checkAndLaunchBatch()`. Remaining capacity already determines the target size, so a static `BACKFILL_THRESHOLD` must not block filling one newly freed slot. The standard pool timeout still governs partial batches when more than one slot remains.

Call the launch check after every event that can free capacity:

- interview expiry;
- interview cancellation;
- candidate withdrawal;
- batch release.

These calls occur after the state-changing transaction commits. Duplicate calls are safe because launch is serialized under the job lock.

Also call `checkAndLaunchBatch()` after a successful target increase on an eligible open job so newly available capacity does not wait for the periodic pool workflow.

### Timeout expiry

Before a timed-out batch releases, expire its due `pending | in_progress` interviews and return their applications to the existing non-invited status using the established expiry behavior. Do not expire `awaiting_voice`. Then release available reports and check for backfill.

Expiry must be a conditional update with `WHERE status IN ('pending', 'in_progress') AND due`. Ordinary cancellation/withdrawal may conditionally cancel only `pending | in_progress | awaiting_voice`. Update the application only when the interview transition actually succeeds, and perform both writes in one transaction. A stale expiry/cancellation must not overwrite `awaiting_voice` or `completed`.

Candidate withdrawal must lock/re-read the application and interview. If the interview is unfinished, cancel it and withdraw the application atomically, then trigger backfill after commit. If the interview is completed, reject withdrawal as too late to cancel evaluation; the committed report remains reserved. Do not make capacity SQL ignore withdrawn applications as a shortcut.

## Phase 4: Correct Batch Completion and Late Reports

### Early completion signal

`isBatchFullyResolved()` currently treats a `completed` interview as resolved even when its report has not been persisted. Change the definition to require every batch interview to satisfy one of:

- interview is `expired | cancelled`; or
- interview is `completed` and its report exists.

This ensures the early batch signal means "all expected reports have been persisted," not merely "all interview rows say completed."

### Atomic report persistence versus batch release

Replace the current new-report path, existing-report early return, and separate `mark_application_evaluated_held` step with one idempotent reconciliation transaction in `app/workflows/post-evaluation/steps.ts`:

1. Lock the associated batch row with `FOR UPDATE` when `interview.batch_id` is non-null, then lock/re-read the interview and application.
2. Verify the interview is still report-producing (`completed`) rather than cancelled by a winning transition.
3. Insert the report or load the existing report idempotently.
4. If the batch is not released, keep the report unreleased and set the application to `evaluated_held`.
5. If the batch is already released, set `released_at = now()` even for a pre-existing stranded report and set the application directly to `evaluated`.
6. If there is no batch, preserve the existing immediate-release behavior.
7. Return a discriminated result describing `held`, `released_now`, or `already_reconciled`, including whether notification reconciliation is required.

Batch release already locks the batch row. Using the same lock creates a deterministic race outcome:

- persistence wins first: release sees and releases the held report;
- release wins first: persistence sees a released batch and creates an immediately released report.

There is no state in which a late report remains permanently held.

Create/reconcile an individual company-team `report_ready` notification in the same transaction whenever a late report becomes released, using `dedupe_key = report:<reportId>` per recipient. This ensures a crash after report commit cannot lose the notification row. Dispatch email after commit and skip notifications already marked sent. Do not send a second `batch_ready` digest for an already released batch. Email delivery is at least once unless the provider exposes an idempotency key.

Batch-ready notifications use `dedupe_key = batch:<batchId>` per recipient. Notification creation and batch release remain in the same transaction.

Retries with an existing report must still run visibility reconciliation, batch-completion signalling, and notification delivery. Remove the workflow's current early return that only restores `evaluated_held`.

The post-evaluation outer failure handler may set `evaluation_failed` only before report persistence commits. Failures in completion signalling, workflow RPC, notification dispatch, or email delivery retry those side effects without reverting an `evaluated`/`evaluated_held` application to `evaluation_failed`.

## Phase 5: Increase-Only Job Targets

Enforce the rule in `app/features/jobs/server/functions.ts` and the source update query in `app/features/jobs/queries/queries.sql`.

1. Run every job update, including draft/closed updates, in a transaction.
2. Lock the owned job row and read its current target.
3. Reject `requestedTarget < currentTarget` with a specific error such as: `The report target can only be increased.`
4. If the target is unchanged, allow unrelated edits even when a later plan downgrade places the stored target above the current plan limit. Apply entitlement validation only to an actual increase.
5. Keep a database predicate on the update (`requested target >= current target`) as a stale-write backstop.

Apply the same rule to `publishJob`. Publishing must never clamp the stored target downward. If a draft target exceeds the current entitlement, reject publication with an upgrade-oriented error; otherwise preserve it exactly.

The form in `app/features/jobs/components/job-form.tsx` should:

- set the numeric field's dynamic minimum to the current target and preserve the current value instead of clamping it to the plan limit;
- explain that the target can be increased but not decreased because candidate evaluations may already be underway;
- surface the server's specific stale/decrease error.

If the current value exceeds the plan after a downgrade, show it unchanged, disable further increases until the company upgrades, and continue allowing unrelated edits. Remove the current client-side `Math.min(existingTarget, reportLimit)` behavior.

The server remains authoritative when two editors submit different increases concurrently. Both may succeed only if each submitted value is at least the target visible under its transaction lock; a stale lower submission must fail rather than undoing a newer increase.

## Phase 6: Company Report-Progress UI

Extend the existing consolidated `getJobApplicantsView` response in `app/features/applications/server/functions.ts`. Keep one server function in the route loader; run any independent reads in parallel inside that function.

Expire due interviews first, then fetch applicants, active batch, and report-progress counts. The current order returns a stale pre-expiry snapshot. Trigger backfill only for interviews actually expired.

Return server-derived counts with these semantics:

- `delivered`: released reports;
- `processing`: completed interviews without a released report, including post-evaluation and `evaluated_held`;
- `underway`: `pending | in_progress | awaiting_voice` interviews;
- `waitlisted`: `queued_for_batch` applications;
- `target`: current `final_report_target`.

Do not derive quota counts solely from client-visible applicant rows because the existing applicant query intentionally hides held reports.

Update `app/routes/_authenticated/dashboard/job-applicants/$jobId.tsx` using the existing `CompanyInboxPageShell`, `PageInlineStats`, and bordered/muted panel language:

- **Delivered:** `2 of 5`
- **Reports processing:** completed interviews whose reports are generating or held
- **Interviews underway:** invited, active, or awaiting voice
- **Waitlisted:** qualified candidates not yet invited

When `processing + underway > 0`, show a clear progress panel. Copy should distinguish certainty:

> **More evaluation results are pending**  
> 1 completed interview is being processed and 2 candidates are still finishing their interviews. Completed reports will appear here automatically. Candidates who do not finish will not count toward your report target.

When the active batch has already released but late work remains, keep the same panel visible; do not tie it only to `activeBatch`. The page must make clear that processing reports will arrive automatically while unfinished interviews are potential reports, not guaranteed reports.

After relevant mutations, follow router ordering rules from `AGENTS.md`: stay on the page and call `router.invalidate()` only. Do not pair an unnecessary navigation with invalidation.

Keep route skeletons in `app/components/route-skeletons.tsx` aligned if the page's visible stat layout changes.

## Test Plan

### Database/query tests

Add focused query tests for:

1. `queued_at` is set on entry, preserved while queued, and cleared on exit.
2. Pool priority remains score-first while oldest pool age uses the minimum `queued_at`.
3. Delivered and reserved counts do not double count a completed interview with a report.
4. `pending`, `in_progress`, `awaiting_voice`, and completed-without-released-report reserve capacity.
5. `expired`, `cancelled`, and released-report applications do not count as reserved.
6. Duplicate interviews per application are rejected.
7. A second forming/active batch for one job is rejected while released historical batches remain allowed.
8. A target decrease update affects zero rows/rejects, while an increase succeeds.
9. Notification dedupe keys reject duplicate invite, report, and batch notification rows for the same recipient and domain event.

### Batch orchestration tests

Expand `app/features/batches/__tests__/pool-formation.test.ts` or add a focused batch quota test file following repository naming conventions:

1. Pool larger than target invites exactly the remaining capacity.
2. Released plus reserved equal to target prevents launch.
3. Released plus reserved below target launches only the difference.
4. Waitlisted candidates remain queued when no capacity exists.
5. Increasing the target makes waiting candidates launchable.
6. One expired/cancelled/withdrawn reservation frees exactly one slot.
7. Remaining capacity below the default batch size becomes the immediate target size.
8. Two concurrent `checkAndLaunchBatch()` calls create one batch, one interview per selected application, and one invite notification per application.
9. Concurrent pre-evaluation queueing and launch do not exceed capacity.
10. Release-triggered and periodic launch calls racing each other remain idempotent.
11. Closed, archived, and expired jobs do not launch new batches.
12. Initial Cloudflare Workflow creation failure leaves an active batch repairable, and periodic reconciliation starts the missing orchestration instance.

Use real SQL lock barriers, not only `Promise.all()`, for race tests. Hold the job row from one connection, start both launch calls, and verify they block before releasing it. Assert every caller settles without leaking a unique-constraint error, then verify batch, interview, application, notification, and `delivered + reserved <= target` state.

### Release and post-evaluation tests

Add tests for both lock orderings:

1. Report exists before release: batch release exposes it and moves the application to `evaluated`.
2. Batch releases before report persistence: persistence creates a released report, moves directly to `evaluated`, and creates one individual report-ready notification.
3. Multiple late reports each release once without reopening the batch or sending another batch digest.
4. Early completion is false when all interviews are completed but any report is missing.
5. Early completion is true when every interview is expired/cancelled or has a persisted report.
6. Timeout expires due `pending | in_progress` interviews but preserves `awaiting_voice`.
7. Existing held reports are reconciled and released when post-evaluation retries after batch release.
8. Report persistence commits and a later signal/notification failure does not move the application to `evaluation_failed`.
9. Retrying late-report reconciliation creates one notification per recipient and still retries unsent delivery.

Force both report/release lock orderings with SQL barriers. A sequential release-then-persist test is useful but does not prove that the shared batch lock closes the race.

### Capacity-freeing transition tests

Exercise canonical services rather than directly updating rows:

1. Expiry versus `awaiting_voice`: a stale expiry affects zero rows and does not free capacity.
2. Cancellation versus voice completion: exactly one terminal transition wins; a winning completion remains reserved.
3. Withdrawal versus unfinished interview: withdrawal atomically cancels and frees one slot.
4. Withdrawal versus completed interview/report persistence: withdrawal is rejected and the committed report remains consumed.
5. Pre-evaluation versus withdrawal/rejection: conditional queueing cannot resurrect the application.
6. Backfill starts only after the capacity-freeing transaction commits.

### Job update tests

1. Increasing from 3 to 5 succeeds when entitled.
2. Decreasing from 5 to 3 fails for draft, open, and closed jobs.
3. Editing unrelated fields while preserving target succeeds.
4. A stale target-5 update cannot overwrite a concurrent increase to 10.
5. Entitlement limits still reject an increase above the plan maximum.
6. Publishing never clamps the target downward; an over-entitlement draft requires an upgrade before publication.
7. A target increase on an open job triggers a post-commit launch check.

Force the stale-update race with a held job-row lock so the test proves transactional comparison rather than scheduler ordering.

### UI/loader tests

Test the server response or the smallest existing UI boundary for:

1. correct delivered/processing/underway/waitlisted counts;
2. late work shown after the active batch is released;
3. no pending-results panel when processing and underway are both zero;
4. the numeric target field preserves its current value, enforces a dynamic minimum, and never clamps a downgraded plan's existing value;
5. progress counts are fetched after due-interview expiry and do not show a stale reservation.

## Implementation Order

1. Add the migration, preflight checks, and source SQL queries; run dbmate and SQLC generation.
2. Add capacity and notification-idempotency query tests before changing orchestration.
3. Make expiry, cancellation, withdrawal, and pre-evaluation transitions conditional and transactional.
4. Implement the one-interview recovery matrix and update established recovery tests.
5. Refactor batch launch under the job lock; move Workflow startup post-commit; add concurrency, repair, and cap tests.
6. Trigger serialized backfill after every capacity-freeing event and target increase.
7. Correct early completion and replace post-evaluation persistence/early-return handling with atomic reconciliation.
8. Enforce increase-only job update/publish behavior and update the form.
9. Add company-facing progress counts and UI after due-interview expiry.
10. Update `AI-LAYER.md`, `ARCHITECTURE.md`, and stale comments to match the final lifecycle.
11. Run focused tests during each phase, then the complete verification suite.

## Verification Commands

At minimum:

```bash
bun run sqlgen
bun run test -- app/features/batches
bun run test -- app/features/jobs
bun run test -- app/features/applications
bun run test -- app/workflows/post-evaluation
bun run check
```

If Vitest path filtering differs for workflow tests, run the exact affected test files followed by `bun run test` before handoff.

## Rollout and Data Handling

There are currently no meaningful users, so implementation should optimize for clean semantics rather than preserving old workflow behavior. Still:

- do not delete reports, interviews, batches, or applications in a migration;
- run duplicate-data preflight queries before adding unique indexes;
- let the owner perform any desired environment reset or report deletion explicitly;
- after deployment, retrigger only workflows whose reports were intentionally removed;
- deploy the correctness changes before restoring multi-candidate production batch sizes, so larger batches cannot amplify the existing race.

## Non-Goals

- Changing plan report limits or billing entitlements.
- Making the report target equal to every individual batch size.
- Cancelling already invited candidates when a job is edited.
- Automatically rejecting waitlisted candidates once the target is delivered.
- Adding a quota reservation table.
- Redesigning candidate-facing status language beyond what is required to keep waitlisted candidates accurate.
- Ranking or rescoring reports within a batch.

## Definition of Done

The work is complete when:

1. Concurrent workflow activity cannot create more report reservations than the job target.
2. No launch occurs when delivered plus reserved capacity equals the target.
3. Qualified candidates queued before the delivered target is reached remain available as a waitlist for expiry, withdrawal, cancellation, or target increase; newly evaluated candidates receive `position_filled` once the delivered target is already full.
4. Late reports become visible automatically after an earlier batch release.
5. Job targets are increase-only at both UI and transactional server boundaries.
6. Companies can distinguish delivered, processing, underway, and waitlisted counts.
7. Race, quota-state, late-report, target-edit, and UI-count regression tests pass.
8. `bun run check` and the relevant test suites pass.
