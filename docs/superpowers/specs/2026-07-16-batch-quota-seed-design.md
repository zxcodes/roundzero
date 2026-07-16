# Batch Quota Seed Design

**Date:** 2026-07-16
**Status:** Approved for implementation

## Goal

Repurpose the existing development seed jobs into predictable product-testing scenarios for batch quota behavior. A developer should be able to inspect quota progress and exercise target increase or rejection backfill without completing multiple AI interviews.

## Design

The current report-count configuration will be replaced by explicit per-job application states. Each open job represents one scenario:

1. **Mixed Pipeline** — delivered, processing, underway, and waitlisted applications appear together.
2. **Capacity Full** — delivered plus reserved equals the target, and additional candidates remain waitlisted.
3. **Increase Target** — starts at capacity with two waitlisted candidates; increasing the target makes those candidates immediately eligible for invitation.
4. **Reject and Backfill** — starts with one pending interview and one waitlisted candidate; rejecting the pending candidate frees and backfills exactly one slot.
5. **Active Batch** — includes held reports and an `awaiting_voice` interview that continues to reserve capacity.
6. **Target Reached** — delivered reports equal the target and remaining candidates stay waitlisted.
7. The existing draft job remains an empty control.

Job titles will include the scenario name so the intended test is obvious in the dashboard.

## Data Rules

- Every scenario satisfies `delivered + reserved <= final_report_target`.
- `queued_for_batch` applications have `queued_at`; all other statuses do not.
- Reserved applications have exactly one interview in `pending`, `in_progress`, `awaiting_voice`, or `completed` without a released report.
- Delivered applications have exactly one released report.
- Held reports belong to an active batch; released reports belong to a released batch or an already released active-batch outcome as appropriate.
- At most one forming or active batch exists per job.
- Seed identifiers remain deterministic and rerunning the seed remains idempotent.

## Verification

- Reset and seed the local database successfully.
- Assert seeded delivered, processing, underway, and waitlisted counts for every scenario.
- Exercise target increase and rejection backfill using the real application services where practical.
- Run SQL generation if source queries change, `bun run check`, `bun run knip`, and the relevant test suites.

The seed validates product-visible states and ordinary mutations. Concurrency and release/persistence races remain covered by the PostgreSQL lock-barrier integration tests rather than manual seed testing.
