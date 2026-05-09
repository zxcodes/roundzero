# RoundZero — Build Plan

> Tech stack, schema, auth, storage, and module layout are documented in `ARCHITECTURE.md`.

---

## Phase 3.5: Pre-AI Hardening

- [x] Add tests for candidate application tracking views
- [ ] Run 5–10 real applications through manual evaluation using the planned output format
- [ ] Show companies the output format and confirm they'd make decisions from it
- [ ] Adjust scoring dimensions, weighting, and presentation based on feedback
- [ ] Document final score schema and report structure in `AI-LAYER.md` (§ 15.5)

---

## Phase 5: Pre-Evaluation Funnel

- [x] Server function returns `{ workflowInstanceId }` for debugging/tracking
- [x] Pre-eval candidates show: name, resume, apply date, "Evaluation in progress"
- [x] Update `getJobApplicants` query to return all applicants (not just evaluated)
- [x] Update `CompanyJobApplicantsList` to handle real pre/post-evaluation states
- [x] Verify low fit stays in `pre_screening` with no interview row
- [x] Verify quota exhaustion sends `position_filled` notification

---

## Phase 6: Interview System

- [x] Add explicit interview lifecycle columns: `invited_at`, `expired_at`, `cancelled_at`, `cancellation_reason` (currently stored in `metadata` JSONB)
- [ ] Final visual polish pass for terminal states and mobile layout edge cases
- [ ] Time/question limits enforcement (configurable per interview type)
- [ ] Interview progress tracking (stage transitions, question count)

---

## Phase 7: Evaluation & Reports

- [ ] Advanced multi-step scoring decomposition (technical/communication/experience as separate LLM calls) — deferred to V2
- [ ] Full local smoke test: apply → pre-eval → invite → interview → complete → post-eval → batch release → company report view
- [ ] Golden-path test case fixture for regression
- [ ] Test: full interview flow with streaming, tool calls, completion
- [ ] Validate full conversational quality (manual UX review pass)

---

## Phase 7.5: Batch Report Release

Replace immediate per-candidate report release with a pool-and-batch system.

**Schema:**
- [ ] Add `job_batches` table
- [ ] Add `interviews.batch_id` column
- [ ] Add `reports.released_at` column
- [ ] Add `queued_for_batch` to `applicationStatusSchema`

**Pre-evaluation changes:**
- [ ] `decideNextStep()`: instead of creating one interview immediately, add candidate to job pool
- [ ] Trigger pool check after every pre-eval completion

**Pool launcher:**
- [ ] `checkAndLaunchBatch()` function (runs on interval + post-eval trigger)
- [ ] Formation rules: target size reached, min size + timeout, or absolute timeout
- [ ] Simultaneous invite of all batch candidates
- [ ] Create `BatchOrchestrationWorkflow` instance per batch

**Batch orchestration workflow:**
- [ ] `BatchOrchestrationWorkflow` using `step.waitForEvent("batch-reports-complete", { timeout: "12 hours" })`
- [ ] `releaseBatch()` — idempotent, transactional
- [ ] `maybeLaunchNextBatch()` — hybrid backfill rule

**Post-evaluation changes:**
- [ ] Update status to `evaluated_held` instead of `evaluated`
- [ ] After report persist, check if batch is fully resolved
- [ ] If yes → `instance.sendEvent({ type: "batch-reports-complete" })` to batch workflow

**Interview agent changes:**
- [ ] Reduce expiry alarm from 48h → 12h
- [ ] On expiry, trigger batch completion check

**Notification changes:**
- [ ] Add `batch_ready` notification type (replaces `report_ready` for batched reports)
- [ ] Batch digest email template (ranked list, scores, recommendations)
- [ ] Remove per-candidate `report_ready` emails

**Candidate UI changes:**
- [ ] Application tracking: show `queued_for_batch` status as "Under review" with explainer
- [ ] Interview invitation card: update copy to reflect 12h deadline (not 48h)
- [ ] Interview workspace: show countdown timer (12h remaining)
- [ ] Post-interview state: show "Evaluation complete" — no score/reveal until batch releases
- [ ] Notification inbox: handle `batch_ready` type (if candidate somehow gets one — they shouldn't, but UI should be safe)

**Company UI changes:**
- [ ] Dashboard:
  - Replace "Reports Studio" real-time cards with "Active Batch" progress card
  - Show: job title, X of Y complete, time until release (or "Releasing now" if all done)
  - Released batches section: ranked list of recent batch drops with "View batch →"
  - Remove per-candidate report highlight cards
- [ ] Job applicants page (`/dashboard/job-applicants/$jobId`):
  - Replace "Evaluated / Pending" tabs with:
    - **Released** — full report cards (same as current evaluated view)
    - **Active Batch** — progress bar + completion count + estimated release time. No candidate names/scores visible yet.
    - **Queued** — count only, no names or scores: "N candidates queued for evaluation"
  - Funnel metrics: update "Evaluated" to mean "released reports" not "generated reports"
- [ ] Batch detail route (`/dashboard/job-batches/$batchId`):
  - Ranked list of all candidates in the batch
  - Each row: avatar, name, overall score, recommendation badge, quick-action buttons (View report, Open applicant)
  - Sortable by score (default), name, recommendation
  - Bulk actions: shortlist/reject multiple at once (future enhancement, but route should support it)
- [ ] Applicant detail page (`/dashboard/applicants/$applicationId`):
  - If status is `evaluated_held`: show "Evaluation complete — releasing in batch" instead of report snapshot card
  - If status is `queued_for_batch`: show "Candidate is queued for the next evaluation batch"
- [ ] Notification inbox:
  - Add `batch_ready` notification type rendering
  - Payload: jobTitle, reportCount, topScore, topCandidateName
  - CTA links to batch detail page
- [ ] Email templates:
  - Batch digest email: subject, ranked table, score bars, recommendation badges, CTAs to each report
  - Remove per-candidate `report_ready` email template (or keep for edge cases but don't use in batch flow)

**Shared UI / Infrastructure:**
- [ ] Add `BatchProgressCard` component to `app/components/ui/` or `app/features/batches/components/`
- [ ] Add `BatchDigestEmail` component to `app/features/notifications/components/`
- [ ] Update `route-skeletons.tsx` with `BatchDetailSkeleton` and `JobBatchesSkeleton`
- [ ] Update `notification-inbox.tsx` to render `batch_ready` type
- [ ] Update `applicationStatusSchema` and all status badge renderers to include `queued_for_batch` and `evaluated_held`

**Config:**
- [ ] `app/features/batches/config.ts` with `BATCH_CONFIG` constants

**Tests:**
- [ ] Pool formation logic (timeout vs size triggers)
- [ ] Batch release idempotency
- [ ] Early release via `waitForEvent`
- [ ] Timeout release
- [ ] Backfill after release

---

## Phase 8: Candidate-Facing Interview & Status Tracking

- [ ] Dedicated `InterviewInvitationCard` component with estimated time and format info

---

## Phase 9: Polish & Edge Cases

- [x] Failed evaluation handling (agent error → retry or manual flag)
- [x] Route skeletons updated for new AI-aware layouts (only generic `InterviewContentSkeleton` exists)
- [x] Loading states for report generation ("Evaluation in progress" spinners)
- [x] Interview chat UI works on mobile (minimal `md:` breakpoints only)
- [x] Report views are readable on small screens
- [x] Track funnel metrics: apply → pre-eval → interview → report
- [x] Time-to-evaluation per job
- [ ] All edge cases handled gracefully
- [ ] Mobile experience is usable
- [ ] No production errors in core AI funnel

---

## Phase 11 (Optional): Web Interface Guidelines Compliance

- [ ] `prefers-reduced-motion` guard for animations
- [ ] `aria-hidden="true"` on decorative icons (wrapper component)
- [ ] Skip link + `<main>` landmark
- [ ] `aria-label` on icon-only buttons, filter selects, search inputs
- [ ] `name` and `autocomplete` on form inputs
- [ ] `tabIndex={-1}` on disabled pagination links
- [ ] Confirmation dialog for destructive status changes
- [ ] Proper `<a>`/`<Link>` for Terms/Privacy
- [ ] Visible `focus-visible` rings on upload buttons
- [ ] Replace `transition-all` with explicit property lists
- [ ] Replace hardcoded `"en-US"` locale with `Intl` defaults
- [ ] Replace `...` with `…` (ellipsis character)
- [ ] Add `text-wrap: balance` to headings
- [ ] Add `tabular-nums` to numeric columns
- [ ] Replace straight apostrophes with curly in `not-found.tsx`

---

## Phase 12 (Post-Release): Landing Page Enhancements

- [ ] Add social proof section (logos, testimonials, or metrics once available)
- [ ] Add candidate-side value prop (brief section addressing job seekers)
- [ ] Add comparison section (traditional screening vs RoundZero side-by-side)

---

## Key Product Decisions (Confirmed)

| # | Decision | Answer |
|---|---|----------|
| 1 | Quota exhausted behavior | Stop creating new interviews when `completedReports >= final_report_target`. Send `position_filled` to remaining pending candidates. They stay in pipeline (`pre_screening`), not auto-rejected. |
| 2 | Default `final_report_target` | `5` per job (max allowed: `15`) |
| 3 | Low-match outcome | Hold in `pre_screening`. Company can manually reject. No system auto-reject. |
| 4 | Unevaluated visibility | Yes — separate "Pending" tab, read-only. Companies see all applicants; only evaluated ones get AI reports. |
| 5 | Pre-evaluation timing | Async. Nothing in the AI flow is synchronous. All steps run as background jobs, queues, or workflows. |
| 6 | Field name for limit | `final_report_target` |

---

## One-Line Definition

> RoundZero deeply evaluates the right candidates, not every candidate.
