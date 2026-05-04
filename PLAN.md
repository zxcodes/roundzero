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
- [ ] Full local smoke test: apply → pre-eval → invite → interview → complete → post-eval → report_ready → company report view
- [ ] Golden-path test case fixture for regression
- [ ] Test: full interview flow with streaming, tool calls, completion
- [ ] Validate full conversational quality (manual UX review pass)

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

## Phase 10 (Optional): Better Auth Migration

- [ ] Install `better-auth` + `pg`, create Better Auth server/client instances
- [ ] Add Better Auth tables (`account`, `session`, `verification`) to init migration
- [ ] Add `email_verified` column to `users`, map `picture` → `image` via fields config
- [ ] Create API route handler (`/api/auth/*`), `getSession`/`ensureSession` server functions
- [ ] Replace `@react-oauth/google` + `loginWithGoogle` with Better Auth Google OAuth flow
- [ ] Replace TanStack Start session management with Better Auth session management
- [ ] Update auth/company middleware to use Better Auth sessions
- [ ] Remove `app/shared/session.ts`, `@react-oauth/google`, `SESSION_SECRET` env var
- [ ] Reset DB, update tests for new schema
- [ ] (Optional) Add magic link, email/password, or 2FA plugins

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
