# RoundZero — Build Plan

> Tech stack, schema, auth, storage, and module layout are documented in `ARCHITECTURE.md`.

---

## Phase 3.5: Pre-AI Hardening (Current)

Finish the non-AI hiring platform so the AI layer lands on a solid foundation.

### Build

#### 1. Candidate Post-Apply Experience

- [x] Add empty states and guidance for first-time candidates on "My Applications"
- [x] Write clear candidate-facing copy for each application status
- [x] Add next-action links per status (complete profile, check back, etc.)
- [ ] Add tests for candidate application tracking views

#### 2. Company Pipeline Quality

- [x] Improve job management list/detail UX for active vs draft vs closed roles
- [x] Add pipeline summary cues: applicant count per status stage per job
- [x] Surface which jobs are attracting applicants vs stale (no applicants in X days)
- [x] Ensure company settings and public profile are coherent

#### 3. Notification Completion

- [x] Add user-facing feedback for company job lifecycle actions (published, archived, closed)
- [x] Replace internal enum labels with product-facing status wording across all surfaces

#### 4. Public Route Cleanup

- [x] Add `JobExpiredNotice` component for expired/closed jobs on public route
- [x] Remove dead code branches in `PublicJobCTA`

#### 5. Test Cleanup

- [x] Replace remaining legacy URL-shaped `resumeKey` test fixtures with realistic key-shaped values

### Product Decisions

These must be answered and documented in `PLATFORM.md` and `AI-LAYER.md` before building Phase 4.

#### Decision 1: Application Status Lifecycle

- [x] Extend existing `applications.status` enum to include all 7 statuses
- [x] Define transition rules and who can trigger each
- [x] Document decided lifecycle in `PLATFORM.md` (§ 15.1)

#### Decision 2: Candidate-Facing Messaging After Apply

- [x] Write candidate-facing copy for each internal status
- [x] Hide pre-evaluation stages; show only 6 candidate-visible statuses
- [x] Define candidate messages for strong / medium / low fit tiers
- [x] Document decided messaging spec in `PLATFORM.md` (§ 15.2)

#### Decision 3: Medium-Fit Follow-Up Medium

- [x] Decide: use synchronous chat UI (same as full interview)
- [x] Questions adapt based on pre-evaluation gaps
- [x] Reuse `interviews` table with metadata flag
- [x] Document decided format in `PLATFORM.md` (§ 15.3)

#### Decision 4: Company View With and Without AI Reports

- [x] Companies see full pipeline; pre-eval candidates are read-only
- [x] Pre-eval candidates show name, resume, date, status only
- [x] Post-eval candidates show + AI score, summary, recommendations
- [x] Document decided company experience spec in `PLATFORM.md` (§ 15.4)

#### Decision 5: Validate Pre-Evaluation Output Format

- [ ] Run 5-10 real applications through manual evaluation using the planned output format
- [ ] Show companies the output format and confirm they'd make decisions from it
- [ ] Adjust scoring dimensions, weighting, and presentation based on feedback
- [ ] Document final score schema and report structure in `AI-LAYER.md` (§ 15.5)

### Exit Criteria

- [x] Candidate can browse, upload a resume, apply from any surface, and track applications with guidance
- [x] Company can create/manage jobs, review applicants, and see pipeline signals
- [x] All 5 product decisions documented in `PLATFORM.md` (§ 15.1–15.5) and `AI-LAYER.md`
- [ ] Pre-evaluation output format validated with real companies (Decision 5 pending external validation)

---

## Phase 4: Schema & Platform Prep for AI

Prepare the database, enums, and server boundaries before the AI funnel goes live.

### 4.1 Application Status Lifecycle

- [x] Migration: extend `applications.status` to 8 statuses
  - `applied`, `pre_screening`, `interview_invited`, `interview_in_progress`, `evaluated`, `shortlisted`, `rejected`, `withdrawn`
- [x] Update `applicationStatusSchema` and `APPLICATION_STATUS_TRANSITIONS` in `app/shared/enums.ts`
- [x] Update all SQL queries that filter/group by status
- [x] Update candidate-visible status mapping and labels
- [x] Add `getVisibleApplicationStatus()` helper and `applicationStatusCandidateLabelMap`

### 4.2 Job Schema Changes

- [x] Migration: add `report_limit INTEGER NOT NULL DEFAULT 5` to `jobs` (max allowed: 15)
- [x] Update `jobFieldsSchema` and `JobFormData` to include `reportLimit`
- [x] Update `createJob` and `updateJob` server functions
- [ ] Add report limit field to `JobForm` UI with copy: "How many candidates should RoundZero evaluate for this role? (Max 15)"
- [x] Enforce max 15 in Zod schema and server functions
- [x] Add `report_limit` to SQLC queries (`createJob`, `updateJob`, `getJobById`)

### 4.3 Pre-Evaluations Table

- [x] Migration: create `pre_evaluations`
  - `id`, `application_id` (unique), `score` (0–100), `missing_requirements` (JSONB), `confidence` (text), `next_step` (text), `created_at`
- [x] SQLC queries: `createPreEvaluation`, `getPreEvaluationByApplicationId`

### 4.4 Interviews Table Update

- [x] Migration: add `type TEXT NOT NULL DEFAULT 'full'` and `metadata JSONB DEFAULT '{}'` to `interviews`
  - `type`: `'full'` | `'quick_eval'`
- [x] SQLC queries updated accordingly

### 4.5 Notifications Refactor

- [x] Remove `new_applicant` from `notificationTypeSchema` and `notificationPayloadSchemas`
- [x] Remove `new_applicant` notification creation from `applyToJobWorkflow`
- [x] Add `report_ready` to `notificationTypeSchema`
- [x] Add `report_ready` payload schema and presentation in `config.ts`
- [x] Add `interview_invited` notification type for candidates
- [x] Add `position_filled` notification type for candidates (sent when `report_limit` is reached)

### 4.7 Cloudflare Workflows Setup

- [x] Create `edge/src/workflows/pre-evaluation.ts`
  - Extends `WorkflowEntrypoint<Env, { applicationId: string }>`
  - Defines durable steps for the pre-evaluation pipeline
- [x] Create `edge/src/workflows/report-generation.ts`
  - Extends `WorkflowEntrypoint<Env, { interviewId: string }>`
  - Defines durable steps for the evaluation pipeline
- [x] Add `workflows` array to `edge/wrangler.jsonc` with both workflow bindings
- [x] Export workflow classes from `edge/src/index.ts`
- [x] Main app triggers workflows via authenticated HTTP `fetch()` to edge Worker

### 4.6 Remove Mock-Only AI Data

- [ ] Delete `app/mock/ai-evaluations.ts`
- [ ] Remove `getMockAiEvaluation` usage from all routes and components
- [ ] Keep UI components (`AiReportPanel`, `AiRankedApplicantsList`, etc.) but wire them to accept real data shapes

### Exit Criteria

- [x] All migrations run cleanly
- [x] `bun run check` passes (lint + types)
- [x] Job creation/editing works with new `report_limit` field
- [x] Applying no longer sends `new_applicant` notifications
- [ ] Old mock data is fully removed from production code paths

---

## Phase 5: Pre-Evaluation Funnel (Cloudflare Workflow)

Build the lightweight pre-evaluation stage as a durable Cloudflare Workflow.

### 5.1 Workflow Definition

- [x] Create `edge/src/workflows/pre-evaluation.ts`
  - Extends `WorkflowEntrypoint<Env, { applicationId: string }>`
  - Steps execute sequentially with automatic retry on failure
  - Each step's result is persisted; interrupted workflows resume from the last completed step

**Workflow Steps:**

1. **`read_application_data`**
   - Query DB for application snapshot, job requirements, job description
   - Return merged context object

2. **`fetch_resume`**
   - Fetch resume blob from R2 using `resume_key`
   - Return raw file bytes + detected mime type

3. **`extract_resume_text`**
   - Route to parser based on file type:
     - `application/pdf` → `unpdf` (local library)
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX) → `mammoth` (local library)
   - Return unstructured text string

4. **`merge_context`**
   - Combine: job description + requirements + resume text + profile metadata
   - Return merged prompt context

5. **`run_ai_pre_evaluation`**
   - Call LLM via AI binding with structured prompt
   - Parse response into: score (0–100), missing_requirements, confidence, next_step
   - Return parsed result

6. **`write_pre_evaluation`**
   - Write result to `pre_evaluations` table
   - Update `applications.status` → `pre_screening`
   - Return pre-evaluation record ID

7. **`decide_next_step`**
   - Check `jobs.report_limit` vs existing report count
   - If high/medium fit + quota available → create `interviews` row (type = `full` or `quick_eval`), update status → `interview_invited`
   - If low fit → stay in `pre_screening`
   - If quota exhausted → send `position_filled` notification to remaining pending candidates

### 5.2 Triggering the Workflow

- [x] Update `applyToJobWorkflow`:
  - After creating application, set status = `applied`
  - Immediately advance to `pre_screening`
  - Trigger workflow via authenticated HTTP `fetch()` to edge Worker `/pre-evaluate`
- [ ] Candidate receives normal "Application Submitted" confirmation
- [ ] No company notification is sent at this stage
- [ ] Server function returns `{ workflowInstanceId }` for debugging/tracking

### 5.4 Company Dashboard: Pending Tab

- [ ] Update `/dashboard/job-applicants/$jobId` to show two sections:
  - **Evaluated**: ranked by report score, actionable
  - **Pending**: pre-evaluation or in-progress, read-only
- [ ] Pre-eval candidates show: name, resume, apply date, "Evaluation in progress"
- [ ] Update `getJobApplicants` query to return all applicants (not just evaluated)
- [ ] Update `CompanyJobApplicantsList` to handle real pre/post-evaluation states

### Exit Criteria

- [x] Applying creates application → triggers pre-evaluation async
- [x] Pre-evaluation result is stored in DB
- [x] High/medium fit candidates with quota get interview rows created
- [x] Low fit candidates stay in pending, no interview created
- [ ] Companies see pending and evaluated sections on applicant list
- [ ] No mock data is used

---

## Phase 5.5: Pre-Evaluation Testing (Required before Phase 6)

Do not proceed to Phase 6 until every item below is verified in local dev.

### End-to-End Verification

- [x] Run both dev servers: `bun run dev` (starts app + edge Worker)
- [x] Sign up as candidate, upload a resume, apply to a job
- [x] Verify main app calls edge Worker `/pre-evaluate` (check network tab / server logs)
- [x] Verify workflow instance is created: `wrangler workflows instances list pre-evaluation --local`
- [x] Verify workflow steps execute: `wrangler workflows instances describe pre-evaluation <id> --local`
- [x] Verify `pre_evaluations` row is written to DB with score, confidence, next_step
- [x] Verify `applications.status` updated to `pre_screening`
- [x] Verify high/medium fit creates `interviews` row (type = `full` or `quick_eval`)
- [x] Verify `applications.status` updated to `interview_invited` for high/medium fit
- [ ] Verify low fit stays in `pre_screening` with no interview row
- [ ] Verify quota exhaustion sends `position_filled` notification
- [x] Verify resume text extraction works for PDF and DOCX
- [x] Check Workers AI neuron usage stays within free tier (10K/day)

### Mock Data Cleanup (blocking)

- [ ] Delete `app/mock/ai-evaluations.ts`
- [ ] Remove `getMockAiEvaluation` usage from all routes and components
- [ ] Update `AiReportPanel`, `AiRankedApplicantsList` to accept real data shapes
- [ ] Verify no compilation errors after mock removal

### Fix Issues

- [x] File any bugs found during testing as sub-items here
- [x] Re-run verification after fixes

**Ready to start Phase 6.**

---

## Phase 6: Interview System

Build the async chat interview surface and backend.

### 6.1 Interview Data Model

- [ ] SQLC queries for interviews: `createInterview`, `getInterviewById`, `getInterviewByApplicationId`, `updateInterviewStatus`, `completeInterview`
- [ ] Server functions in `app/features/interviews/server/functions.ts`
  - `createInterviewForApplication`
  - `getMyInterview`
  - `getInterviewChatHistory`
  - `submitInterviewMessage`
  - `completeInterview`

### 6.2 Interview Agent Boundary

- [ ] Create `edge/src/agents/interview-agent.ts`
  - Durable Object class for interview sessions
  - System prompt construction from job requirements + resume snapshot
  - For `quick_eval`: system prompt instructs 2–3 clarifying questions only
  - For `full`: full interview script
- [ ] Add agent class to `edge/wrangler.jsonc` with Durable Object binding + `new_sqlite_classes` migration
- [ ] Keep agent prompt/tool logic behind an explicit boundary so it can be tested independently of routes

### 6.3 Interview Chat UI

- [ ] Route: `/interview/$interviewId`
- [ ] `InterviewChat` component in `app/features/interviews/components/interview-chat.tsx`
  - Async chat UI (text-based, no video)
  - Shows transcript, current question, input field
  - Handles resumable streams
- [ ] Candidate interview status page (`/dashboard/application/$applicationId` updates):
  - `interview_invited`: show interview invitation card with CTA to start
  - `interview_in_progress`: show "Interview in Progress" card
  - `evaluated`: show "Under Review" messaging
- [ ] Add candidate-facing empty/error states for expired, already-completed, or unavailable interviews

### 6.4 Interview Lifecycle

- [ ] When candidate starts interview → `status = interview_in_progress`
- [ ] When interview completes (agent calls `completeInterview`) → trigger evaluation pipeline (Phase 7)
- [ ] Time/question limits enforcement (configurable per interview type)
- [ ] Interview progress tracking (stage transitions, question count)

### Exit Criteria

- [ ] Candidate can start a full or quick evaluation interview from their application detail page
- [ ] Interview transcript and messages are persisted
- [ ] Interview completion triggers the evaluation pipeline
- [ ] Status transitions follow the funnel correctly

---

## Phase 7: Evaluation & Reports

Build the report generation pipeline and company-facing report UI with real data.

### 7.1 Report Generation Workflow

- [x] Create `edge/src/workflows/report-generation.ts`
  - Extends `WorkflowEntrypoint<Env, { interviewId: string }>`
  - Triggered when interview completes

**Workflow Steps:**

1. **`read_interview_data`**
   - Query DB for interview transcript, application snapshot, job context
   - Return combined evaluation input

2. **`technical_assessment`**
   - Call LLM with technical scoring prompt
   - Output: technical_score (0–100), reasoning

3. **`communication_assessment`**
   - Call LLM with communication scoring prompt
   - Output: communication_score (0–100), reasoning

4. **`experience_validation`**
   - Call LLM to validate resume claims against interview answers
   - Output: experience_relevance_score (0–100), verified claims, flags

5. **`consistency_check`**
   - Call LLM to detect contradictions between resume and interview
   - Output: inconsistency_flags, risk_notes

6. **`aggregate_scores`**
   - Weight and combine dimension scores into final score
   - Output: overall_score, recommendation (strong/moderate/weak)

7. **`write_report`**
   - Write full report to `reports` table
   - Update `applications.status` → `evaluated`
   - Return report ID

8. **`send_report_ready_notification`**
   - Create in-app notification for company owner
   - Send Resend email (best-effort)
   - No retry on email failure — notification record is the source of truth

### 7.2 Report Data Model

- [ ] SQLC queries: `createReport`, `getReportByApplicationId`, `getReportsByJobId`, `getReportById`
- [ ] Report shape (from `reports` table + inferred types):
  - overall score, recommendation, technical score, communication score, experience relevance score
  - strengths, concerns, evidence quotes
  - question/answer timeline
  - summary

### 7.3 Report Delivery to Companies

- [ ] After report is written, send `report_ready` notification to company owner:
  - In-app notification
  - Resend email (best-effort)
- [ ] Notification payload: candidate name, job title, score, recommendation, link to report
- [ ] Update `app/features/notifications/config.ts` with `report_ready` presentation

### 7.4 Company Report UI (Real Data)

- [ ] Update `/dashboard/job-applicants/$jobId`:
  - Replace mock evaluation with real report data
  - Rank evaluated candidates by report score
  - Show recommendation badges, scores, summary snippets
- [ ] Update `/dashboard/applicants/$applicationId`:
  - Replace mock `AiReportPanel` with real report query
  - Show full report if evaluated, "Evaluation in progress" if not
  - Action buttons (shortlist / reject) only when `status = evaluated`
- [ ] Update `/dashboard/applicant-reports/$applicationId`:
  - Replace mock `AiFullReport` with real report data
  - Show question/answer timeline, dimension scores, evidence
- [ ] Add `app/features/reports/components/` for reusable report views

### Exit Criteria

- [ ] Interview completion triggers real report generation
- [ ] Report is written to Postgres and readable by company
- [ ] Company receives `report_ready` notification (in-app + email)
- [ ] Applicant list and detail pages show real report data, no mocks
- [ ] `bun run check` passes

---

## Phase 8: Candidate-Facing Interview & Status Tracking

Polish the candidate experience for the AI-aware statuses.

### 8.1 Application Progress UI

- [ ] Update `/dashboard/applications` to show visible statuses:
  - `applied` / `pre_screening` → "Application Received"
  - `interview_invited` → "Interview Ready"
  - `interview_in_progress` → "Interview in Progress"
  - `evaluated` → "Under Review"
  - `shortlisted` → "Shortlisted"
  - `rejected` → "Not Moving Forward"
- [ ] Update `/dashboard/application/$applicationId`:
  - Strong fit: "You've been invited to complete RoundZero for this role."
  - Medium fit: "A few additional questions will help evaluate your fit."
  - Low fit: "Application received and under review."
  - Add interview completed state with submitted timestamp, question count, and clear "under review" messaging

### 8.2 Interview Invitation Cards

- [ ] Add `InterviewInvitationCard` for `interview_invited` status
  - CTA: "Start RoundZero"
  - Estimated time, question count, format info
- [ ] Add `InterviewInProgressCard` for `interview_in_progress` status
  - Link back to active interview
  - "You can resume any time"

### Exit Criteria

- [ ] Candidate dashboard accurately reflects AI-aware statuses
- [ ] Interview invitation and in-progress cards are functional
- [ ] Status copy matches PLATFORM.md §15.2 spec

---

## Phase 9: Polish & Edge Cases

### 9.1 Error Handling

- [ ] Expired interview handling (candidate tries to start after deadline)
- [ ] Failed evaluation handling (agent error → retry or manual flag)
- [ ] Already-completed interview guards

### 9.2 Optimistic UI & Loading States

- [ ] Route skeletons updated for new AI-aware layouts
- [ ] Optimistic status transitions where appropriate
- [ ] Loading states for report generation ("Evaluation in progress" spinners)

### 9.3 Mobile Responsiveness Pass

- [ ] Interview chat UI works on mobile
- [ ] Report views are readable on small screens

### 9.4 Analytics & Metrics (Optional)

- [ ] Track funnel metrics: apply → pre-eval → interview → report
- [ ] Time-to-evaluation per job

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
|---|----------|--------|
| 1 | Quota exhausted behavior | Stop creating new interviews. Send `position_filled` notification to remaining pending candidates. They stay in pipeline (`pre_screening`), not auto-rejected. |
| 2 | Default `report_limit` | `5` per job (max allowed: `15`) |
| 3 | Low-match outcome | Hold in `pre_screening`. Company can manually reject. No system auto-reject. |
| 4 | Unevaluated visibility | Yes — separate "Pending" tab, read-only. Companies see all applicants; only evaluated ones get AI reports. |
| 5 | Pre-evaluation timing | Async. Nothing in the AI flow is synchronous. All steps run as background jobs, queues, or workflows. |
| 6 | Field name for limit | `report_limit` |

---

## One-Line Definition

> RoundZero deeply evaluates the right candidates, not every candidate.
