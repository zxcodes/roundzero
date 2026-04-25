# RoundZero — Build Plan

> Tech stack, schema, auth, storage, and module layout are documented in `ARCHITECTURE.md`.

---

## Phase 3.5: Pre-AI Hardening (Complete)

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

- [x] Migration: add `final_report_target INTEGER NOT NULL DEFAULT 5` to `jobs` (max allowed: 15)
- [x] Update `jobFieldsSchema` and `JobFormData` to include `finalReportTarget`
- [x] Update `createJob` and `updateJob` server functions
- [ ] Add final report target field to `JobForm` UI with copy: "How many final candidate reports should RoundZero deliver for this role? (Max 15)"
- [x] Enforce max 15 in Zod schema and server functions
- [x] Add `final_report_target` to SQLC queries (`createJob`, `updateJob`, `getJobById`)

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
- [x] Add `position_filled` notification type for candidates (sent when `final_report_target` is reached)

### 4.7 Cloudflare Workflows Setup

- [x] Create `edge/src/workflows/pre-evaluation.ts`
  - Extends `WorkflowEntrypoint<Env, { applicationId: string }>`
  - Defines durable steps for the pre-evaluation pipeline
- [x] Create `edge/src/workflows/post-evaluation.ts`
  - Extends `WorkflowEntrypoint<Env, { interviewId: string }>`
  - Defines durable steps for the evaluation pipeline
- [x] Add `workflows` array to `edge/wrangler.jsonc` with both workflow bindings
- [x] Export workflow classes from `edge/src/index.ts`
- [x] Main app triggers workflows via authenticated HTTP `fetch()` to edge Worker

### 4.6 Remove Mock-Only AI Data

- [x] Delete `app/mock/ai-evaluations.ts`
- [x] Remove `getMockAiEvaluation` usage from all routes and components
- [x] Replaced mock UI with real report components in `app/features/reports/components/`

### Exit Criteria

- [x] All migrations run cleanly
- [x] `bun run check` passes (lint + types)
- [x] Job creation/editing works with new `final_report_target` field
- [x] Applying no longer sends `new_applicant` notifications
- [x] Old mock data is fully removed from production code paths

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
   - Compute capacity with:
     - `remainingReports = final_report_target - completedReports`
     - `availableInviteSlots = remainingReports - activeInterviews(status IN pending|in_progress)`
   - If high/medium fit + invite slot available → create `interviews` row (type = `full` or `quick_eval`) with `expires_at = invited_at + 48 hours`, update status → `interview_invited`
   - If low fit → stay in `pre_screening`
   - If target reached (`completedReports >= final_report_target`) → send `position_filled` notification to remaining pending candidates

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
- [x] Companies see pre-evaluation results on applicant detail page
- [x] Mock data fully removed from production code paths

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

- [x] Delete `app/mock/ai-evaluations.ts`
- [x] Remove `getMockAiEvaluation` usage from all routes and components
- [x] Update `AiReportPanel`, `AiRankedApplicantsList` to accept real data shapes
- [x] Verify no compilation errors after mock removal

### Fix Issues

- [x] File any bugs found during testing as sub-items here
- [x] Re-run verification after fixes

**Ready to start Phase 6.**

---

## Phase 6: Interview System

Build the async chat interview surface and backend.

### 6.1 Interview Data Model

- [x] SQLC queries for interviews: `createInterview`, `getInterviewById`, `getInterviewByApplicationId`, `updateInterviewStatus`, `completeInterview`
- [x] Server functions in `app/features/interviews/server/functions.ts`
  - `createInterviewForApplication`
  - `getMyInterview`
  - `getInterviewForApplication`
  - `completeMyInterview`
- [ ] Add explicit interview lifecycle columns: `invited_at`, `expires_at`, `expired_at`, `cancelled_at`, `cancellation_reason` (currently stored in `metadata` JSONB)

### 6.2 Interview Agent Boundary

- [ ] Create `edge/src/agents/interview-agent.ts`
  - Durable Object class for interview sessions
  - System prompt construction from job requirements + resume snapshot
  - For `quick_eval`: system prompt instructs 2–3 clarifying questions only
  - For `full`: full interview script
- [ ] Add agent class to `edge/wrangler.jsonc` with Durable Object binding + `new_sqlite_classes` migration
- [ ] Keep agent prompt/tool logic behind an explicit boundary so it can be tested independently of routes

### 6.3 Interview Chat UI

- [x] Route: `/dashboard/interview/$interviewId` (moved under authenticated dashboard workspace)
- [x] Interview chat surface implemented with reusable transcript + composer components
  - Async chat UI (text-based, no video)
  - Shows transcript, current question, input field
- [x] Candidate application detail page (`/dashboard/application/$applicationId`) shows interview card with CTA for `interview_invited` and `interview_in_progress`
- [ ] Add candidate-facing empty/error states for expired, already-completed, or unavailable interviews
- [ ] Final visual polish pass for terminal states and mobile layout edge cases

Current implementation status:

- [x] Interview workspace layout is live: app sidebar + interview session pane + full-width chat pane
- [x] Candidate interviews index route exists (`/dashboard/interviews`) and redirects to most recent session when available
- [x] Transcript scroll is contained in chat panel (no page growth)
- [x] Composer preserves focus after send and supports fast back-to-back answers
- [x] Interview notifications deep-link to `/dashboard/interview/$interviewId`

### 6.4 Interview Lifecycle

- [x] When candidate starts interview → `status = interview_in_progress`
- [x] When interview completes → triggers post-evaluation workflow
- [x] 48-hour interview expiry policy (`expires_at` in metadata) for invited interviews
- [ ] Add candidate cancel flow: set interview status to `cancelled`, set application status to `withdrawn`, then backfill next best candidate
- [x] Automatic backfill: when interview expires, promote next best eligible candidate until `final_report_target` reports are completed or pool is exhausted
- [ ] Time/question limits enforcement (configurable per interview type)
- [ ] Interview progress tracking (stage transitions, question count)

Current implementation status:

- [x] 48-hour expiry cron (`*/5 * * * *`) expires overdue interviews
- [x] Expiry notifications (`interview_expired`) are created
- [x] Backfill currently runs after expiry and invites next best candidates
- [x] Interview agent context guard blocks start/message until required context exists
- [x] Context refresh path is implemented before start/message and is migration-safe for older DO sessions

### Exit Criteria

- [ ] Candidate can start a full or quick evaluation interview from their application detail page
- [ ] Interview transcript and messages are persisted
- [ ] Interview completion triggers the evaluation pipeline
- [ ] Status transitions follow the funnel correctly

---

## Phase 7: Evaluation & Reports

Build the report generation pipeline and company-facing report UI with real data.

### 7.1 Post-Evaluation Workflow

- [x] Create `edge/src/workflows/post-evaluation.ts`
  - Extends `WorkflowEntrypoint<Env, { interviewId: string }>`
  - Triggered when interview completes via `POST /post-evaluate`

**Implemented Workflow Steps:**

1. **`load_existing_report`** — idempotency check; skip if report already exists
2. **`read_interview_data`** — query DB for interview context + transcript from Durable Object state
3. **`generate_report`** — single LLM call with structured JSON schema output
   - Outputs: summary, strengths, weaknesses, insights, evidence, dimension scores, recommendation
   - Fallback deterministic report used when LLM returns invalid JSON or non-conforming shape
4. **`persist_report`** — write to `reports` table; update `applications.status` → `evaluated`
5. **`notify_report_ready`** — create in-app notification for company owner
6. **`send_report_ready_email`** — best-effort Resend email to company owner (skips gracefully if unconfigured)

Current implementation status:

- [x] Trigger endpoint is `POST /post-evaluate` in edge worker
- [x] Workflow binding is `POST_EVALUATION`
- [x] Report persistence is live (`createReport`)
- [x] `report_ready` in-app notification creation is live
- [x] Best-effort email delivery for `report_ready` is live (`edge/src/shared/email.ts`)
- [ ] Advanced multi-step scoring decomposition (technical/communication/experience as separate LLM calls) — deferred to V2

### 7.2 Report Data Model

- [x] SQLC queries: `getReportByApplicationId`, `getReportsByJobId`, `getReportById` (app-side)
- [x] Report shape (from `reports` table):
  - overall score, recommendation
  - dimension scores (communication, problemSolving, ownership, roleFit)
  - strengths, weaknesses, insights, evidence
  - summary

### 7.3 Report Delivery to Companies

- [x] After report is written, send `report_ready` notification to company owner:
  - In-app notification
  - Resend email (best-effort)
- [x] Notification payload: candidate name, job title, score, recommendation, link to report
- [x] Update `app/features/notifications/config.ts` with `report_ready` presentation
- [x] Notification deep link points to `/dashboard/applicant-reports/$applicationId`
- [x] `interview_expired` notification type exists with presentation

### 7.4 Company Report UI (Real Data)

- [x] Update `/dashboard/job-applicants/$jobId`:
  - Shows real report scores and recommendation badges
  - Ranked by score (evaluated first, then pending)
- [x] Update `/dashboard/applicants/$applicationId`:
  - Shows real post-eval summary card with score + dimension badges
  - Links to full report page
  - Pre-evaluation card is visually secondary when report exists
- [x] Update `/dashboard/applicant-reports/$applicationId`:
  - Shows full report: summary, recommendation, overall score, dimension scores
  - Shows strengths/weaknesses/insights/evidence
  - Shows timeline: pre-screening, interview transcript, post-evaluation
- [x] `app/features/reports/components/report-cards.tsx` for reusable report views

### 7.5 Flow Completion Gap List (Complete)

- [x] Report retrieval queries and server functions live
- [x] Company report surfaces wired to real data
- [x] Score format: `/100` across all surfaces (consistent)
- [x] Notification deep links validated
- [x] Email delivery path live in edge worker
- [x] Deterministic fallback with logging when AI response is invalid
- [x] Idempotency: duplicate post-eval triggers skip if report already exists
- [ ] Full local smoke test: apply → pre-eval → invite → interview → complete → post-eval → report_ready → company report view
- [ ] Golden-path test case fixture for regression

### Exit Criteria

- [x] Interview completion triggers real report generation
- [x] Report is written to Postgres and readable by company
- [x] Company receives `report_ready` notification (in-app + email)
- [x] Applicant list and detail pages show real report data, no mocks
- [x] `bun run check` passes

---

## Phase 7.5: Interview Agent Migration to Cloudflare Agents SDK

Replace the raw Durable Object + `env.AI.run()` interview implementation with the Cloudflare Agents SDK (`agents`, `@cloudflare/ai-chat`, `workers-ai-provider`). This unlocks streaming, proper conversational memory, tools, and the AI SDK v5 ecosystem.

### Why Migrate

| Current (Raw DO) | Agents SDK |
|---|---|
| Manual message persistence in SQLite via `ctx.storage.put()` | Built-in message history via `AIChatAgent` |
| Rigid JSON schema forcing robot output (`{"question": "string"}`) | Free-form streaming text via `streamText()` |
| No streaming — candidate waits for full response | Real-time token streaming over WebSocket |
| Static fallback questions (hardcoded strings) | Dynamic generation with full conversation context |
| No tool use — agent cannot evaluate answers or look up context | Native tool calling for answer evaluation, resume gap detection |
| Flat transcript string passed to LLM | Structured `UIMessage[]` history via `convertToModelMessages()` |
| HTTP polling for state on every message | WebSocket push — agent pushes updates, client receives instantly |
| Manual session lifecycle management | `onChatMessage`, `onStart`, `onClose` lifecycle hooks |

### 7.5.1 Backend: Edge Worker Agent

**Install dependencies:**
```bash
cd edge && npm install agents @cloudflare/ai-chat workers-ai-provider ai
```

**New file: `edge/src/agents/interview-agent.ts`**

- Extend `AIChatAgent<Env>` instead of raw `DurableObject`
- Override `onChatMessage(onFinish)` — called on every candidate message
- Use `streamText({ model: workersai("@cf/meta/llama-3.1-8b-instruct-fp8"), messages, system })` from `ai` package
- Inject interview context (job, candidate, pre-eval) into the `system` prompt
- Define tools the agent can call:
  - `evaluate_answer` — score the candidate's last answer on relevance, depth, clarity
  - `check_resume_gap` — verify claims against resume/candidate summary
  - `end_interview` — signal completion when enough signal is gathered
- Use `this.setState()` for interview metadata (status, scores, startedAt)
- Messages are persisted automatically by `AIChatAgent` — no manual `ctx.storage.put()`

**System prompt design:**
- Agent identity: "You are Zero, a skilled interviewer at RoundZero."
- Goal: "Evaluate this candidate for [role] at [company]."
- Style: "Be conversational. Acknowledge what the candidate says. Ask follow-ups based on their specific answers. Reference their resume and job requirements. Probe vague answers. If they say something interesting, dig deeper."
- Constraints: "Never ask generic questions — every question should be tailored to this specific candidate and role."
- Context injection: job description, requirements, candidate summary, pre-eval score/gaps

**Interview lifecycle:**
- `pending` → candidate hits "Start" → agent `onStart()` sets status to `in_progress`
- `in_progress` → candidate sends messages → `onChatMessage()` streams response
- Agent decides when enough signal is gathered (via tool call or turn count)
- `completed` → agent triggers post-evaluation workflow via RPC or HTTP

**Remove old files:**
- `edge/src/agents/interview-agent.ts` (raw DO version) → replaced
- Keep `edge/src/shared/interview-agent-client.ts` temporarily for backward compat during migration

### 7.5.2 Frontend: TanStack + Agents SDK Client

**Install dependencies:**
```bash
cd app && npm install agents @cloudflare/ai-chat/react ai
```

**New file: `app/features/interviews/hooks/use-interview-chat.ts`**

- Uses `useAgent({ agent: "InterviewAgent", name: interviewId })` from `agents/react`
- Uses `useAgentChat({ agent })` from `@cloudflare/ai-chat/react`
- Returns: `messages`, `sendMessage`, `status`, `isStreaming`, `isServerStreaming`
- `status` values: `"submitted" | "streaming" | "ready" | "error"`
- Auto-reconnection with exponential backoff built-in

**New file: `app/features/interviews/components/interview-chat.tsx`**

- Replaces `InterviewTranscript` + `InterviewComposer` combo
- Uses `UIMessage` type from `ai` package
- Renders messages with `msg.parts` (text parts, tool-call parts)
- Streaming indicator: `isStreaming` shows "Zero is typing..."
- Tool call visibility: show when Zero is evaluating or checking resume gaps
- No more manual `localMessages` + `loaderMessages` merge — `useAgentChat` handles optimistic updates + server sync

**Route update: `app/routes/_authenticated/dashboard/interview/$interviewId.tsx`**

- Remove `getMyInterviewState` server function call
- Remove manual `useState` for local message buffering
- Remove `useMutation` for `submitInterviewMessage`
- Replace with `useInterviewChat` hook
- Remove interview list sidebar — `useAgent` can sync state, or keep a separate query
- Add streaming-aware UI: progressive message reveal, typing indicator

### 7.5.2a Frontend: Interview Layout Rewrite

The interview experience gets a dedicated layout separate from the main dashboard chrome. This is a full rewrite of the interview frontend.

**New layout: `app/routes/_authenticated/interview.tsx`**

- Separate layout route outside `/dashboard` — lives at `/interview/$interviewId`
- No main app sidebar, no dashboard header, no max-width container
- Clean two-pane workspace:
  - **Left pane**: shadcn `<Sidebar>` with interview session list
  - **Right pane**: full-bleed chat surface
- Dark-first design: deep background, high-contrast chat bubbles

**Sidebar (`app/features/interviews/components/interview-sidebar.tsx`)**

- Built on shadcn `<Sidebar>` + `<SidebarContent>` + `<SidebarMenu>`
- Collapsible on desktop (icon-only mode), swipeable drawer on mobile
- Lists all candidate interviews with:
  - Job title + company name
  - Status badge (Ready, In progress, Completed, Expired)
  - Timestamp
  - Active state highlight
- "New interview" indicator for unread/pending
- Footer with candidate profile mini-card

**Chat surface (`app/features/interviews/components/interview-chat.tsx`)**

- Full remaining width, no max-width constraints
- Header bar: job title, company, status badge, actions (cancel, submit)
- Message area: streaming text render with `UIMessage` parts
- Typing indicator: animated "Zero is typing..." when `isStreaming`
- Composer: fixed bottom, full-width input, send button
- No scroll jank: message area uses native scroll with contained overflow

**Navigation changes**

- Main app sidebar "Interviews" link navigates to `/interview` (redirects to most recent session)
- Interview notifications deep-link to `/interview/$interviewId`
- Back button from interview layout returns to `/dashboard/applications` or `/dashboard` depending on context
- URL structure: `/interview` (index/redirect), `/interview/$interviewId` (active session)

**Files to delete/replace**

- `app/routes/_authenticated/dashboard/interview/$interviewId.tsx` → replaced by new layout + route
- `app/routes/_authenticated/dashboard/interviews.tsx` → redirect logic moves to `/interview` index
- `app/features/interviews/components/interview-transcript.tsx` → merged into `InterviewChat`
- `app/features/interviews/components/interview-composer.tsx` → merged into `InterviewChat`

**Design principles**

- Zero chrome: no cards, no borders, no shadows unless necessary
- Content-first: the conversation is the UI
- Dark ambient: near-black background, subtle surface elevations
- Fluid: sidebar collapses smoothly, chat adapts to full width
- Fast: WebSocket streaming, no polling spinners

### 7.5.3 Worker Route Handlers

**Update `edge/src/worker.ts`**

- Add Agents SDK Hono middleware: `app.use("/agents/*", agentsMiddleware())`
- Register `InterviewAgent` class via `app.agents("InterviewAgent", InterviewAgent)`
- Remove manual `/interviews/:interviewId/start`, `/message`, `/state`, `/complete` endpoints
- Keep `/post-evaluate` endpoint — triggered by agent on completion
- Keep `/internal/interviews/:interviewId/state` for company report timeline (read-only transcript)

### 7.5.4 Context Injection

**Problem:** The agent needs job + candidate context at init time.

**Solution:** `onStart()` or `onConnect()` fetches context from Postgres:
```ts
async onStart() {
  const db = getDb();
  const context = await getInterviewContextById(db, { id: this.name });
  this.setState({
    jobTitle: context.jobTitle,
    jobDescription: context.jobDescription,
    candidateSummary: context.candidateSummary,
    preEvaluation: context.preEvaluation,
  });
}
```

This context is then injected into the `system` prompt on every `streamText()` call.

### 7.5.5 Migration Checklist

**Backend:**
- [ ] Install `agents`, `@cloudflare/ai-chat`, `workers-ai-provider`, `ai` in edge
- [ ] Create new `InterviewAgent` class extending `AIChatAgent`
- [ ] Implement `onChatMessage` with `streamText` + system prompt + tools
- [ ] Implement `onStart` for context injection
- [ ] Update `worker.ts` to register agent and remove manual endpoints
- [ ] Update `wrangler.jsonc` with Agents SDK bindings if needed

**Frontend:**
- [ ] Install `agents`, `@cloudflare/ai-chat/react`, `ai` in app
- [ ] Create `app/routes/_authenticated/interview.tsx` layout (shadcn Sidebar + chat pane)
- [ ] Create `app/routes/_authenticated/interview/$interviewId.tsx` route
- [ ] Create `app/routes/_authenticated/interview/index.tsx` (redirect to most recent session)
- [ ] Create `InterviewSidebar` component (shadcn Sidebar with session list)
- [ ] Create `InterviewChat` component (streaming chat surface)
- [ ] Create `useInterviewChat` hook wrapping `useAgent` + `useAgentChat`
- [ ] Update main app sidebar "Interviews" link to point to `/interview`
- [ ] Update interview notification deep links to `/interview/$interviewId`
- [ ] Delete old dashboard interview routes and components
- [ ] Ensure `bun run check` passes
- [ ] Test: full interview flow with streaming, tool calls, completion

### 7.5.6 Conversational UX Requirements

The agent must feel like a real interviewer, not a survey bot:

- **Greeting:** Warm, contextual. "Hey [Name], I'm Zero. I've reviewed your profile and I'm excited to learn more about your work on [specific project from resume]. Ready when you are."
- **Acknowledgment:** Every candidate answer gets a brief acknowledgment before the next question. "That's a solid approach — I like how you prioritized user feedback. Let me dig a bit deeper..."
- **Follow-ups:** Dynamic based on answer content. If candidate mentions "user testing," follow up with "How do you recruit participants for those tests?" If vague, probe: "Can you give me a specific example?"
- **Resume-aware:** Reference specific skills, companies, or projects from the candidate summary. "You mentioned leading a team at [Company] — how big was that team?"
- **Job-aware:** Tie questions to specific requirements. "This role needs someone who can balance speed with quality — how do you handle that tension?"
- **Closing:** Natural wrap-up, not abrupt. "This has been great — I have a clear picture of your approach. We'll compile this and get it to the team. Good luck!"

### Exit Criteria

**Agent behavior:**
- [ ] Interview agent streams responses token-by-token
- [ ] Candidate sees "Zero is typing..." while response generates
- [ ] Agent asks contextual follow-ups based on previous answers
- [ ] Agent references resume and job details naturally in conversation
- [ ] Agent uses tools to evaluate answers and decide when to end
- [ ] Interview completion triggers post-evaluation workflow

**Frontend layout:**
- [ ] Interview has dedicated layout at `/interview/$interviewId` (not nested in dashboard)
- [ ] shadcn Sidebar shows interview session list with status badges
- [ ] Chat surface is full-bleed, dark ambient, content-first
- [ ] Streaming messages render progressively without jank
- [ ] Mobile: sidebar collapses to icon rail or swipeable drawer
- [ ] Main app sidebar "Interviews" link navigates to `/interview`

**Cleanup:**
- [ ] Old raw DO interview endpoints are removed
- [ ] Old dashboard interview routes and components are deleted
- [ ] `bun run check` passes

---

## Phase 8: Candidate-Facing Interview & Status Tracking (Partial)

Polish the candidate experience for the AI-aware statuses.

### 8.1 Application Progress UI

- [x] Update `/dashboard/application/$applicationId`:
  - Shows interview card with CTA for `interview_invited` and `interview_in_progress`
  - Shows completed/expired/cancelled states
  - Status mapping: `interview_invited` / `interview_in_progress` → "Interviewing" stage
- [ ] Update `/dashboard/applications` list to show visible status labels:
  - `applied` / `pre_screening` → "Application Received"
  - `interview_invited` → "Interview Ready"
  - `interview_in_progress` → "Interview in Progress"
  - `evaluated` → "Under Review"
  - `shortlisted` → "Shortlisted"
  - `rejected` → "Not Moving Forward"

### 8.2 Interview Invitation Cards

- [x] Application detail page shows interview card with CTA
  - "Start interview" for pending, "Continue interview" for in-progress
- [ ] Dedicated `InterviewInvitationCard` component with estimated time and format info

### Exit Criteria

- [x] Candidate application detail accurately reflects AI-aware statuses
- [ ] Interview invitation card with format/estimates
- [ ] Applications list uses visible status labels

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

### 9.5 Pre-Evaluation Visibility (Implemented)

- [x] Pre-evaluation card is visually secondary on company applicant detail when a post-eval report exists (muted styling, collapsed prominence)
- [x] Post-eval report card is primary: shows actual score, summary, recommendation, and "View full report" link
- [ ] Company view should have explicit **Pending** / **Evaluated** tabs on job applicants page
- [ ] Pre-eval scores remain accessible for internal funnel debugging

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
| 1 | Quota exhausted behavior | Stop creating new interviews when `completedReports >= final_report_target`. Send `position_filled` to remaining pending candidates. They stay in pipeline (`pre_screening`), not auto-rejected. |
| 2 | Default `final_report_target` | `5` per job (max allowed: `15`) |
| 3 | Low-match outcome | Hold in `pre_screening`. Company can manually reject. No system auto-reject. |
| 4 | Unevaluated visibility | Yes — separate "Pending" tab, read-only. Companies see all applicants; only evaluated ones get AI reports. |
| 5 | Pre-evaluation timing | Async. Nothing in the AI flow is synchronous. All steps run as background jobs, queues, or workflows. |
| 6 | Field name for limit | `final_report_target` |

---

## One-Line Definition

> RoundZero deeply evaluates the right candidates, not every candidate.
