# RoundZero — Build Plan

> Tech stack, schema, auth, storage, and module layout are documented in `ARCHITECTURE.md`.

---

## Phase 3.5: Pre-AI Hardening

Finish the non-AI hiring platform so the AI layer lands on a solid foundation.

- [ ] Add tests for candidate application tracking views

### Product Decisions

#### Decision 5: Validate Pre-Evaluation Output Format

- [ ] Run 5–10 real applications through manual evaluation using the planned output format
- [ ] Show companies the output format and confirm they'd make decisions from it
- [ ] Adjust scoring dimensions, weighting, and presentation based on feedback
- [ ] Document final score schema and report structure in `AI-LAYER.md` (§ 15.5)

### Exit Criteria

- [ ] Pre-evaluation output format validated with real companies (Decision 5 pending external validation)

---

## Phase 4: Schema & Platform Prep for AI

Prepare the database, enums, and server boundaries before the AI funnel goes live.

- [x] ~~Add final report target field to `JobForm` UI~~ (implemented in `app/features/jobs/components/job-form.tsx`)

---

## Phase 5: Pre-Evaluation Funnel (Cloudflare Workflow)

Build the lightweight pre-evaluation stage as a durable Cloudflare Workflow.

### 5.2 Triggering the Workflow

- [x] ~~Candidate receives normal "Application Submitted" confirmation~~ (toast + workflow confirmation exists)
- [x] ~~No company notification is sent at this stage~~ (`new_applicant` removed from workflow)
- [ ] Server function returns `{ workflowInstanceId }` for debugging/tracking

### 5.4 Company Dashboard: Pending Tab

- [x] ~~Update `/dashboard/job-applicants/$jobId` to show two sections~~ (implemented: Evaluated / Pending tabs)
- [ ] Pre-eval candidates show: name, resume, apply date, "Evaluation in progress"
- [ ] Update `getJobApplicants` query to return all applicants (not just evaluated)
- [ ] Update `CompanyJobApplicantsList` to handle real pre/post-evaluation states

---

## Phase 5.5: Pre-Evaluation Testing (Required before Phase 6)

Do not proceed to Phase 6 until every item below is verified in local dev.

- [ ] Verify low fit stays in `pre_screening` with no interview row
- [ ] Verify quota exhaustion sends `position_filled` notification

---

## Phase 6: Interview System

Build the async chat interview surface and backend.

### 6.1 Interview Data Model

- [ ] Add explicit interview lifecycle columns: `invited_at`, `expired_at`, `cancelled_at`, `cancellation_reason` (currently stored in `metadata` JSONB)

### 6.3 Interview Chat UI

- [x] ~~Add candidate-facing empty/error states for expired, already-completed, or unavailable interviews~~ (handled in `InterviewWorkspaceContent` with status badges and `isEnded` guard)
- [ ] Final visual polish pass for terminal states and mobile layout edge cases

### 6.4 Interview Lifecycle

- [x] ~~Add candidate cancel flow: set interview status to `cancelled`, set application status to `withdrawn`~~ (`cancelMyInterview` in `app/features/interviews/server/functions.ts`)
- [ ] Time/question limits enforcement (configurable per interview type)
- [ ] Interview progress tracking (stage transitions, question count)

### Exit Criteria

- [x] ~~Candidate can start a full or quick evaluation interview from their application detail page~~ (`startMyInterview` exists)
- [x] ~~Interview transcript and messages are persisted~~ (Agents SDK `AIChatAgent` handles persistence)
- [x] ~~Interview completion triggers the evaluation pipeline~~ (`completeMyInterview` triggers post-evaluation workflow)
- [x] ~~Status transitions follow the funnel correctly~~ (enforced in `app/shared/enums.ts`)

---

## Phase 7: Evaluation & Reports

Build the report generation pipeline and company-facing report UI with real data.

### 7.1 Post-Evaluation Workflow

- [ ] Advanced multi-step scoring decomposition (technical/communication/experience as separate LLM calls) — deferred to V2

### 7.5 Flow Completion Gap List

- [ ] Full local smoke test: apply → pre-eval → invite → interview → complete → post-eval → report_ready → company report view
- [ ] Golden-path test case fixture for regression

---

## Phase 7.5: Interview Agent Migration to Cloudflare Agents SDK

Replace the raw Durable Object + `env.AI.run()` interview implementation with the Cloudflare Agents SDK.

### 7.5.5 Migration Checklist

- [x] ~~Install `agents`, `@cloudflare/ai-chat/react`, `ai`~~
- [x] ~~Create new `InterviewAgent` class extending `AIChatAgent`~~ (`app/agents/interview.ts`)
- [x] ~~Implement `onChatMessage` with `streamText` + system prompt + tools~~
- [x] ~~Implement `onStart` for context injection~~
- [x] ~~Update `worker.ts` to register agent routing~~
- [x] ~~Update `wrangler.jsonc` to remove legacy interview expiry cron trigger~~
- [x] ~~Create `app/routes/_authenticated/interview.tsx` layout~~
- [x] ~~Create `app/routes/_authenticated/interview/$interviewId.tsx` route~~
- [x] ~~Create `InterviewSidebar` component with session list~~
- [x] ~~Create `InterviewChat` component (streaming chat surface)~~
- [x] ~~Create `useInterviewChat` hook wrapping `useAgent` + `useAgentChat`~~
- [x] ~~Update navigation/deep links to `/interview/$interviewId`~~
- [x] ~~Delete old dashboard interview routes and old transcript/composer components~~
- [x] ~~Ensure `bun run check` passes~~
- [ ] Test: full interview flow with streaming, tool calls, completion

### Exit Criteria

- [x] ~~Interview agent streams responses token-by-token~~
- [x] ~~Candidate sees streaming state while response generates~~
- [x] ~~Agent receives contextual system prompt with job/candidate/pre-eval context~~
- [x] ~~Agent uses tools to evaluate answers and decide when to end~~
- [x] ~~Interview completion path triggers post-evaluation workflow~~
- [ ] Validate full conversational quality (manual UX review pass)
- [x] ~~Interview has dedicated layout at `/interview/$interviewId`~~
- [x] ~~Sidebar shows interview session list with status labels~~
- [x] ~~Chat surface is full-bleed, dark ambient, content-first~~
- [x] ~~Streaming messages render progressively~~
- [x] ~~Mobile: session list available via sheet drawer~~
- [x] ~~Navigation/deep links point to `/interview/$interviewId`~~
- [x] ~~Old manual interview chat endpoints are removed~~
- [x] ~~Old dashboard interview routes/components are deleted~~
- [x] ~~`bun run check` passes~~

---

## Phase 8: Candidate-Facing Interview & Status Tracking

Polish the candidate experience for the AI-aware statuses.

### 8.1 Application Progress UI

- [x] ~~Update `/dashboard/applications` list to show visible status labels~~ (implemented with `stageCopy` mapping)

### 8.2 Interview Invitation Cards

- [ ] Dedicated `InterviewInvitationCard` component with estimated time and format info

### Exit Criteria

- [x] ~~Candidate application detail accurately reflects AI-aware statuses~~
- [ ] Interview invitation card with format/estimates
- [x] ~~Applications list uses visible status labels~~

---

## Phase 9: Polish & Edge Cases

### 9.1 Error Handling

- [x] ~~Expired interview handling (candidate tries to start after deadline)~~ (handled by `expireInterviewIfNeeded`)
- [ ] Failed evaluation handling (agent error → retry or manual flag)
- [x] ~~Already-completed interview guards~~ (`completeMyInterview` throws if already completed)

### 9.2 Optimistic UI & Loading States

- [ ] Route skeletons updated for new AI-aware layouts (only generic `InterviewContentSkeleton` exists)
- [ ] Optimistic status transitions where appropriate
- [ ] Loading states for report generation ("Evaluation in progress" spinners)

### 9.3 Mobile Responsiveness Pass

- [ ] Interview chat UI works on mobile (minimal `md:` breakpoints only)
- [ ] Report views are readable on small screens

### 9.4 Analytics & Metrics (Optional)

- [ ] Track funnel metrics: apply → pre-eval → interview → report
- [ ] Time-to-evaluation per job

### 9.5 Pre-Evaluation Visibility

- [x] ~~Pre-evaluation card is visually secondary on company applicant detail when a post-eval report exists~~ (muted styling in `app/routes/_authenticated/dashboard/applicants/$applicationId.tsx`)
- [x] ~~Post-eval report card is primary: shows actual score, summary, recommendation, and "View full report" link~~
- [x] ~~Company view should have explicit Pending / Evaluated tabs on job applicants page~~ (implemented in `app/routes/_authenticated/dashboard/job-applicants/$jobId.tsx`)
- [x] ~~Pre-eval scores remain accessible for internal funnel debugging~~ (visible on company applicant detail page)

### Exit Criteria

- [ ] All edge cases handled gracefully
- [ ] Mobile experience is usable
- [ ] No production errors in core AI funnel

---

## Phase 10 (Optional): Better Auth Migration

Replaces hand-rolled Google OAuth + encrypted cookie sessions. Unlocks magic links, email/password, 2FA.

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

### Systemic

- [ ] `prefers-reduced-motion` guard for animations
- [ ] `aria-hidden="true"` on decorative icons (wrapper component)
- [ ] Skip link + `<main>` landmark

### Accessibility

- [ ] `aria-label` on icon-only buttons, filter selects, search inputs
- [ ] `name` and `autocomplete` on form inputs
- [ ] `tabIndex={-1}` on disabled pagination links
- [ ] Confirmation dialog for destructive status changes
- [ ] Proper `<a>`/`<Link>` for Terms/Privacy
- [ ] Visible `focus-visible` rings on upload buttons

### Animation & Performance

- [ ] Replace `transition-all` with explicit property lists
- [ ] Replace hardcoded `"en-US"` locale with `Intl` defaults

### Typography & Copy

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
