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
- [x] Add `job_batches` table
- [x] Add `interviews.batch_id` column
- [x] Add `reports.released_at` column
- [x] Add `queued_for_batch` to `applicationStatusSchema`

**Pre-evaluation changes:**
- [x] `decideNextStep()`: instead of creating one interview immediately, add candidate to job pool
- [x] Trigger pool check after every pre-eval completion

**Pool launcher:**
- [x] `checkAndLaunchBatch()` function (runs on interval + post-eval trigger)
- [x] Formation rules: target size reached, min size + timeout, or absolute timeout
- [x] Simultaneous invite of all batch candidates
- [x] Create `BatchOrchestrationWorkflow` instance per batch

**Batch orchestration workflow:**
- [x] `BatchOrchestrationWorkflow` using `step.waitForEvent("batch-reports-complete", { timeout: "12 hours" })`
- [x] `releaseBatch()` — idempotent, transactional
- [x] `maybeLaunchNextBatch()` — hybrid backfill rule

**Post-evaluation changes:**
- [x] Update status to `evaluated_held` instead of `evaluated`
- [x] After report persist, check if batch is fully resolved
- [x] If yes → `instance.sendEvent({ type: "batch-reports-complete" })` to batch workflow

**Interview agent changes:**
- [x] Reduce expiry alarm from 48h → 12h
- [~] On expiry, trigger batch completion check — expiry marks DB row but does not signal the batch workflow early (relies on 12h timeout)

**Notification changes:**
- [x] Add `batch_ready` notification type (replaces `report_ready` for batched reports)
- [x] Batch digest email template (ranked list, scores, recommendations)
- [~] Remove per-candidate `report_ready` emails — kept for non-batched (legacy/manual) edge cases, not used in batch flow

**Candidate UI changes:**
- [x] Application tracking: show `queued_for_batch` status as "Under review" with explainer
- [~] Interview invitation card: update copy to reflect 12h deadline (not 48h) — no hardcoded copy; shows dynamic `expiresAt` deadline
- [x] Interview workspace: show countdown timer (12h remaining)
- [x] Post-interview state: show "Evaluation complete" — no score/reveal until batch releases
- [x] Notification inbox: handle `batch_ready` type (if candidate somehow gets one — they shouldn't, but UI should be safe)

**Company UI changes:**
- [x] Dashboard:
  - Replace "Reports Studio" real-time cards with "Active Batch" progress card
  - Show: job title, X of Y complete, time until release (or "Releasing now" if all done)
- [~] Dashboard — Released batches section: ranked list of recent batch drops with "View batch →" — currently shows per-candidate report cards, not batch-level cards
- [~] Dashboard — Remove per-candidate report highlight cards — still present in "Released Batches" section
- [x] Job applicants page (`/dashboard/job-applicants/$jobId`):
  - Replace "Evaluated / Pending" tabs with:
    - **Released** — full report cards (same as current evaluated view)
    - **Active Batch** — progress bar + completion count + estimated release time. No candidate names/scores visible yet.
    - **Queued** — count only, no names or scores: "N candidates queued for evaluation"
- [~] Job applicants page — Funnel metrics: update "Evaluated" to mean "released reports" not "generated reports" — currently counts both `evaluated` and `evaluated_held`
- [x] Batch detail route (`/dashboard/job-batches/$batchId`):
  - Ranked list of all candidates in the batch
  - Each row: avatar, name, overall score, recommendation badge, quick-action buttons (View report, Open applicant)
  - Sortable by score (default), name, recommendation
  - Bulk actions: shortlist/reject multiple at once (future enhancement, but route should support it)
- [ ] Applicant detail page (`/dashboard/applicants/$applicationId`):
  - If status is `evaluated_held`: show "Evaluation complete — releasing in batch" instead of report snapshot card
  - If status is `queued_for_batch`: show "Candidate is queued for the next evaluation batch"
- [x] Notification inbox:
  - Add `batch_ready` notification type rendering
  - Payload: jobTitle, reportCount, topScore, topCandidateName
  - CTA links to batch detail page
- [x] Email templates:
  - Batch digest email: subject, ranked table, score bars, recommendation badges, CTAs to each report
- [~] Email templates — Remove per-candidate `report_ready` email template (or keep for edge cases but don't use in batch flow) — kept for edge cases

**Shared UI / Infrastructure:**
- [ ] Add `BatchProgressCard` component to `app/components/ui/` or `app/features/batches/components/` — currently inline in `JobApplicantsPage`
- [x] Add `BatchDigestEmail` component to `app/features/notifications/components/`
- [~] Update `route-skeletons.tsx` with `BatchDetailSkeleton` and `JobBatchesSkeleton` — `BatchDetailSkeleton` exists; `JobBatchesSkeleton` does not
- [x] Update `notification-inbox.tsx` to render `batch_ready` type
- [x] Update `applicationStatusSchema` and all status badge renderers to include `queued_for_batch` and `evaluated_held`

**Config:**
- [x] `app/features/batches/config.ts` with `BATCH_CONFIG` constants

**Tests:**
- [x] Pool formation logic (timeout vs size triggers)
- [x] Batch release idempotency
- [x] Early release via `waitForEvent`
- [ ] Timeout release — no dedicated test for the timeout path
- [x] Backfill after release

---

## Phase 8: Candidate-Facing Interview & Status Tracking

- [x] Dedicated `InterviewInvitationCard` component with estimated time and format info

---

## Phase 9: Polish & Edge Cases

- [x] Failed evaluation handling (agent error → retry or manual flag)
- [x] Route skeletons updated for new AI-aware layouts (only generic `InterviewContentSkeleton` exists)
- [x] Loading states for report generation ("Evaluation in progress" spinners)
- [x] Interview chat UI works on mobile (minimal `md:` breakpoints only)
- [x] Report views are readable on small screens
- [x] Track funnel metrics: apply → pre-eval → interview → report
- [x] Time-to-evaluation per job
- [x] Mobile experience is usable (responsive Tailwind layouts throughout)
- [ ] All edge cases handled gracefully
- [ ] No production errors in core AI funnel

---

## Phase 10: Voice Communication Assessment

- [x] Voice assessment agent (`app/agents/voice.ts`) with STT/TTS pipeline via `@cloudflare/voice`
- [x] Inline voice assessment UI as interview workspace tab (replaces separate route)
- [x] `useVoiceAgent` hook for call state management, `useQuery` for status polling
- [x] Structured analysis via `generateObject` against `communicationAssessmentSchema`
- [x] 5 dimension scores (clarity, articulation, conciseness, listening, confidence)
- [x] Voice analysis rendered in company report with score bars, evidence, and transcript
- [x] Refresh-resume support (DO persists `in_call` state, `intentionalEnd` flag)
- [x] Report timeline node with distinct completed / skipped / not-completed states
- [ ] Landing page voice assessment section (waveform + scores mockup) ✓ added
- [ ] Candidate-side UI polish for voice transitions and error recovery

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
- [x] Add candidate-side value prop ("For candidates" section in the Interview spread)
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

## Phase 13: SEO Foundations

- [x] Add `Sitemap:` directive to `robots.txt` pointing to `/sitemap.xml`
- [x] Dynamic XML sitemap route (`/sitemap.xml`) with all open jobs + companies
- [x] Self-referencing canonical URLs on every public route
- [x] Per-route meta descriptions for all public pages (including dynamic job/company pages)
- [x] Missing OG tags: `og:site_name`, `og:description`, `og:url`
- [x] Per-route OG meta tags on dynamic pages
- [x] JSON-LD structured data: `JobPosting` on job detail pages
- [x] JSON-LD structured data: `Organization` on company detail pages
- [x] Static OG image (`public/og-default.jpeg`) + `og:image`/`twitter:image` meta tags
- [ ] Set up Google Search Console and submit sitemap
- [ ] Monitor index coverage after sitemap submission
- [ ] Add breadcrumb structured data to job and company pages

---

## One-Line Definition

> RoundZero deeply evaluates the right candidates, not every candidate.
