# RoundZero – Architecture

## 0. Status

This document reflects the app as it transitions from **platform-only** to **platform + AI layer**.

**Currently Not (NOT IN PROD):**

- TanStack Start application (Nitro runtime)
- Postgres-backed hiring platform
- role-based company/candidate workflows
- public company and jobs browsing
- one-click applications with profile snapshots
- durable in-app notifications with Resend email delivery
- Cloudflare Workflows for pre-evaluation and post-evaluation pipelines
- Cloudflare Agents SDK interview runtime (`AIChatAgent`)
- AI-driven candidate evaluation and structured reports
- `final_report_target` quota system per job
- 8-status application lifecycle with pre-screening funnel
- dedicated candidate interview workspace at `/interview/$interviewId`
- company-facing report views with scoring and timeline

---

## 1. Stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start (React 19, Vite 8) |
| Runtime (app) | TanStack Start + Nitro |
| Runtime (AI) | Cloudflare Workers (separate edge Worker with Workflows + Durable Objects) |
| Database | Postgres (Docker locally, Neon intended for prod) |
| Typed queries | SQLC |
| Migrations | dbmate |
| Auth | Google OAuth with server-side cookie session |
| UI | shadcn/ui, Tailwind CSS v4, Hugeicons |
| Validation | Zod |
| Notifications | In-app inbox + Resend email delivery |
| File storage | Cloudflare R2 for resumes and company logos |
| AI layer | Cloudflare Workers AI + edge Worker |
| AI pipelines | Cloudflare Workflows (durable multi-step) in edge Worker |
| Interview runtime | Cloudflare Agents SDK (`AIChatAgent`) + `workers-ai-provider` |
| Chat transport | WebSocket via Agents SDK (streaming) |
| Linting | Biome |

---

## 2. Runtime Architecture

### Main App (Nitro)

The app runs as a standard TanStack Start app with server functions for:

- auth
- jobs
- applications
- company profile management
- candidate profile management
- dashboard metrics
- notifications
- resume/logo storage contracts

### AI Edge Worker (Cloudflare Workers)

The AI layer lives in a separate `edge/` directory as a standalone Cloudflare Worker:

- Hono HTTP server with `/pre-evaluate`, `/post-evaluate`, and internal report endpoints
- Cloudflare Workflows run pre-evaluation and report generation pipelines
- Agents SDK routes interview agents over WebSocket/HTTP
- R2 stores resumes
- Workers AI binding provides model inference

**Why a separate Worker:**
- Cloudflare Workflows only execute in `wrangler dev` / deployed Workers, not in the Vite plugin's local dev
- The main app needs fast HMR and standard Node.js dev (Nitro)
- The edge Worker gets real workflow step execution, bindings, and Durable Objects
- One command (`bun run dev`) starts both via `bun run --parallel`

**Communication:**
- Main app calls edge Worker via authenticated HTTP `fetch()`
- Edge Worker reads/writes the same Postgres database
- Both share DB schema and SQLC-generated queries (generated to both locations)

### Directory Layout

```
roundzero/              # Main app - TanStack Start + Nitro
├── app/                # Routes, components, server functions
├── db/                 # Migrations, seed
└── package.json        # TanStack Start deps

edge/                   # AI Worker - Cloudflare Workers
├── src/
│   ├── worker.ts       # Hono + Agents fetch handler
│   ├── workflows/      # Cloudflare Workflow classes
│   ├── agents/         # Durable Object agent classes
│   ├── queries/        # SQLC-generated query files
│   └── shared/         # DB connection, env validation
├── package.json        # Wrangler, Workers deps
└── wrangler.jsonc      # AI, R2, Workflow, DO bindings
```

The codebase keeps clean boundaries:

- explicit server functions in the main app
- storage behind server contracts
- database-centric source of truth
- agent logic lives in the edge Worker, triggered by HTTP from the main app

---

## 3. Current Product Surface

## Routes

Current file-based routes:

```
app/routes/
├── __root.tsx
├── _authenticated.tsx
├── _authenticated/dashboard.tsx
├── _authenticated/dashboard/applicants/$applicationId.tsx
├── _authenticated/dashboard/applicant-reports/$applicationId.tsx
├── _authenticated/dashboard/application/$applicationId.tsx
├── _authenticated/dashboard/applications.tsx
├── _authenticated/dashboard/index.tsx
├── _authenticated/dashboard/job-applicants/$jobId.tsx
├── _authenticated/dashboard/jobs/new.tsx
├── _authenticated/dashboard/jobs/index.tsx
├── _authenticated/dashboard/jobs/$jobId.tsx
├── _authenticated/dashboard/settings.tsx
├── _authenticated/interview.tsx           # interview layout (shadcn Sidebar + chat pane)
├── _authenticated/interview/index.tsx     # redirects to most recent session
├── _authenticated/interview/$interviewId.tsx
├── _authenticated/onboarding.tsx
├── _authenticated/onboarding/candidate.tsx
├── _authenticated/onboarding/company.tsx
├── candidate/login.tsx
├── companies/index.tsx
├── companies/$slug.tsx
├── company/login.tsx
├── index.tsx
├── jobs/index.tsx
└── jobs/$jobId.tsx
```

What this means in practice:

- public browsing exists
- role-specific login exists
- company/candidate onboarding exists
- dashboard basics exist
- dedicated company applicant review pages exist
- dedicated candidate application detail pages exist
- candidate application tracking exists
- notification inbox exists in the app shell

Missing route surface today:

- none for core MVP interview/report flows

---

## 4. Current Feature Modules

```
app/features/
├── auth/
├── applications/
├── candidates/
├── companies/
├── dashboard/
├── interviews/
├── jobs/
├── notifications/
├── pre-evaluations/
└── reports/
```

### What exists

- `auth`: login/session/provider/query layer
- `companies`: company CRUD/settings/logo upload/public data
- `candidates`: candidate profile/settings and resume contract
- `jobs`: job CRUD, filtering, pagination, status/archive/expiry behavior, interview questions
- `applications`: one-click apply, applicant lists, application status, notification workflows
- `dashboard`: role-specific metrics
- `interviews`: interview lifecycle, dedicated workspace routes, agent chat hooks/components, server functions
- `notifications`: per-user in-app notification inbox, Resend email delivery, workflow event records
- `pre-evaluations`: pre-screening result queries and compact card components
- `reports`: post-evaluation report queries, server functions, and reusable report view components

### AI layer (in `edge/`)

- `edge/src/workflows/pre-evaluation.ts`
- `edge/src/workflows/post-evaluation.ts`
- `edge/src/agents/interview-agent.ts`
- `edge/src/shared/email.ts` (Resend helper for workflow email delivery)

---

## 5. Directory Structure

```
app/
├── routes/              # TanStack file-based routes
├── features/            # Product feature modules
├── components/          # Shared/global UI
├── shared/              # DB, middleware, form helpers, shared utilities
├── lib/                 # Small app utilities
├── router.tsx
└── styles.css

edge/
├── src/
│   ├── index.ts         # Worker entrypoint (Hono HTTP server)
│   ├── workflows/       # Cloudflare Workflow classes
│   ├── agents/          # Durable Object agent classes
│   ├── queries/         # SQLC-generated query files
│   └── shared/          # DB connection, env validation
├── package.json         # Edge Worker dependencies
└── wrangler.jsonc       # Worker bindings configuration

db/
├── migrations/          # dbmate init migration
└── schema.sql           # generated schema dump
```

Conventions:

- feature-first structure
- SQL lives beside each feature under `queries/queries.sql`
- generated SQLC output is the typed query boundary
- server functions are the app-facing mutation/read boundary

---

## 6. Database Schema

Source of truth:

- `db/migrations/20260328081657_init.sql`

Schema dump:

- `db/schema.sql`

### Key Tables

#### `users`

- identity
- Google auth linkage
- app role (`company` or `candidate`)

#### `companies`

- owned by a company user
- contains both onboarding data and public profile data
- includes public `slug`

#### `candidate_profiles`

- one per candidate user
- stores:
  - headline
  - `resume_key`
  - bio
  - skills
  - work history
  - links

#### `jobs`

- owned by a company
- stores structured hiring data
- includes:
  - status
  - salary info
  - team/headcount
  - `final_report_target` (default 5, max 15) — controls how many final reports companies receive
  - `interview_questions` (JSONB, for AI agent context)
  - `expires_at`
  - `archived_at`

#### `applications`

- unique per `(job_id, candidate_id)`
- stores:
  - `resume_key` snapshot
  - `metadata` snapshot for non-resume candidate profile data
  - status: `applied`, `pre_screening`, `interview_invited`, `interview_in_progress`, `evaluated`, `shortlisted`, `rejected`

This is important architecturally:

- `candidate_profiles` is the current source of truth
- `applications` is the apply-time snapshot

#### `pre_evaluations`

- one per application
- stores lightweight pre-evaluation output:
  - `score` (0–100)
  - `missing_requirements` (JSONB)
  - `confidence` (high/medium/low)
  - `next_step` (invite_roundzero / ask_followups / hold)

#### `interviews`

- link between applications and AI interview sessions
- stores:
  - `type`: `'full'` | `'quick_eval'`
  - `status`: `'pending'` | `'in_progress'` | `'completed'` | `'expired'` | `'cancelled'`
  - `metadata` (JSONB) — includes `expiresAt`, `expiredAt`, `cancelledAt`, `cancellationReason`
  - `started_at`, `completed_at`

#### `reports`

- evaluation output after interview completion
- stores structured report data:
  - overall score, recommendation
  - dimension scores (technical, communication, experience relevance)
  - strengths, concerns, evidence
  - question/answer timeline

Quota semantics:

- `final_report_target` is consumed by completed reports, not interview invites
- invite capacity per job is computed as:
  - `remainingReports = final_report_target - completedReports`
  - `availableInviteSlots = remainingReports - activeInterviews(status IN pending|in_progress)`
- if an interview expires or is cancelled, that slot is recycled and the next best candidate is invited

### Schema Decisions

- No DB enums/check constraints for app-domain statuses
- Zod validates enum-like values in app code
- No triggers
- `updated_at` is set explicitly in update queries
- JSONB is used for structured but flexible data
- all FKs use `ON DELETE RESTRICT`

---

## 7. Query and Type Strategy

- SQLC is the typed DB layer
- generated `queries_sql.ts` files are never hand-edited
- no manual DB/data-shape types should be re-declared in app components when they can be inferred from SQLC or server function return types
- JSONB columns should be passed as raw JS objects/arrays, not stringified

Data flow pattern:

1. SQL query in `queries.sql`
2. SQLC generates typed query function
3. feature server function wraps query and business rules
4. route loader or mutation consumes server function
5. components infer types from loader/server return values

---

## 8. Auth Architecture

Current auth flow:

1. Candidate or company hits a role-specific login route
2. Google OAuth succeeds
3. server upserts the user
4. session cookie is written
5. role determines onboarding/dashboard path

Characteristics:

- simple and sufficient for current phase
- cookie-session based
- no DB-backed session table

Future note:

- Better Auth remains a later optional migration if more auth methods are needed

---

## 9. Current Application Flow

### Candidate profile + resume

Current intended flow:

1. Candidate completes onboarding
2. Candidate uploads resume through the app
3. app stores `resume_key` on `candidate_profiles`
4. candidate can maintain profile in settings

### Applying

1. Candidate selects a job
2. app checks if they already applied
3. app checks whether `candidate_profiles.resume_key` exists
4. app creates application row
5. application snapshots:
   - `resume_key`
   - profile metadata

### Company review

1. Company views a job or the dedicated applicants page for that job
2. navigates into a dedicated applicant/application detail route
3. sees submitted resume, snapshot data, timestamps, and current status
4. updates application status from that review surface

---

## 10. Resume Storage Architecture

Resume handling uses a **contract-first** design.

### Current model

- the database stores `resume_key`, not `resume_url`
- onboarding/settings use file-picking UI
- the server already exposes resume upload/read boundaries
- resume uploads now use real Cloudflare R2 signed URLs in the current runtime

### Resume server boundaries

Current candidate resume server functions:

- `createResumeUploadTarget`
- `finalizeResumeUpload`
- `getResumeDownloadUrl`

Current company/application resume server function:

- `getApplicationResumeDownloadUrl`

### Current flow

1. client requests signed upload target
2. server creates user-scoped key:
   - `resumes/<userId>/<uuid>--<sanitized-file-name>.<ext>`
3. client uploads directly to Cloudflare R2
4. server verifies the object exists in R2 during finalize
5. server stores `resume_key` on `candidate_profiles`
6. candidate self-view and company applicant review use short-lived signed URLs

### Runtime note

- Resume upload uses S3-compatible R2 API from the main app server with presigned `PUT`/`GET` URLs
- The edge Worker accesses the same R2 bucket via native `env.RESUMES` binding for workflow resume extraction

Why `resume_key` instead of `resume_url`:

- stable internal reference
- avoids coupling DB state to delivery URL format
- easier to move between CDN/signed URL strategies later

---

## 11. Notifications Architecture

Notifications are implemented as a durable in-app inbox with Resend-backed email delivery as a secondary best-effort channel. In-app notification records are the primary system of record.

### Current model

- `notifications` table stores:
  - `id`
  - `user_id`
  - `type`
  - `payload`
  - `read_at`
  - `email_delivery_status`
  - `email_delivery_error`
  - `email_delivery_attempted_at`
  - `email_delivery_sent_at`
  - `email_provider_message_id`
  - `created_at`
- supported event types:
  - `application_status_changed`
  - `report_ready`
  - `interview_invited`
  - `interview_expired`
  - `position_filled`
  - `job_published`, `job_archived`, `job_closed`
  - `application_withdrawn`
- application statuses include all 8: `applied`, `pre_screening`, `interview_invited`, `interview_in_progress`, `evaluated`, `shortlisted`, `rejected`, `withdrawn`
- the app shell/dashboard header renders the inbox surface

### Current module layout

```
app/features/notifications/
├── components/
│   ├── notification-email-template.tsx
│   └── notification-inbox.tsx
├── config.ts
├── queries/
│   ├── queries.sql
│   └── queries_sql.ts
├── server/
│   └── functions.ts
└── services/
    └── email.ts
```

Provider:

- **Resend**

Current email-backed use cases:

- candidate application status updates
- company-side report ready notifications
- interview expiry notifications

Future email-backed use cases:

- interview ready / interview reminder
- position filled notifications

Recommended architecture:

- write a notification record to the database first
- treat in-app notifications as the primary system of record
- send email as a secondary best-effort delivery channel for selected events
- keep notification sending behind server-side functions/services
- trigger notifications from explicit workflow events, not UI-only actions
- persist delivery result directly on the notification row while there is only one secondary transport
- do not couple domain logic directly to a provider SDK in routes/components

Current delivery tracking:

- `notifications`
  - keeps `type` + `payload` as the canonical event record
  - stores email delivery attempt/result fields directly on the row

Future extension points:

- move email delivery attempts into a separate table once we need retries, webhooks, or multiple secondary channels

Design principle:

- if email delivery fails, the notification still exists in-app
- email is a transport, not the canonical event record

Current module additions:

- `app/features/notifications/services/email.ts`

---

## 12. Job Lifecycle Architecture

Jobs support:

- draft/open/closed states
- archive behavior
- `expires_at` with date picker on create/edit
- stale role indicator (90+ days with no expiry)
- auto-close on read for expired jobs
- hidden-by-default expired/closed jobs on public surfaces
- `interview_questions` JSONB field for future AI agent context

AI integration:

- `final_report_target` controls how many final reports companies receive per job
- `interview_questions` (JSONB) feeds into agent system prompts

---

## 13. Testing Architecture

Two Postgres containers:

| Container | Port | Purpose |
| --- | --- | --- |
| `rz_pg_dev` | 6311 | development |
| `rz_pg_test` | 6312 | tests |

Testing approach:

- real Postgres for query and workflow tests
- no DB mocking for query/business-logic layers
- shared test setup handles cleanup
- seed helpers create minimal valid records

Current coverage focus:

- auth queries
- companies queries
- jobs queries/business logic
- applications queries/business logic
- application notification workflows
- dashboard metrics
- notifications queries

Coverage needed for AI layer:

- pre-evaluation workflow steps (with mocked LLM responses)
- report generation workflow steps
- interview agent state transitions
- quota exhaustion logic

---

## 14. AI Architecture

The AI layer runs in a separate `edge/` Cloudflare Worker, triggered by authenticated HTTP calls from the main app.

### Pre-Evaluation Pipeline (Cloudflare Workflow)

- Triggered when the main app POSTs to `/pre-evaluate` on the edge Worker
- Durable multi-step execution:
  1. Read application + job from Postgres
  2. Fetch resume from R2
  3. Extract text from resume based on file type (PDF / DOCX)
  4. Merge profile metadata + resume text + job context
  5. Call LLM for scoring
  6. Write result to `pre_evaluations`
  7. Decision layer: create interview or hold
- Automatic retries per step
- Resumes from last completed step if interrupted

### Interview Layer (Cloudflare Agents SDK)

- One `AIChatAgent` instance per interview session (extends Durable Object)
- Built-in message persistence via `AIChatAgent` SQLite storage
- WebSocket streaming transport (token-by-token responses)
- System prompt injected with job requirements + resume context via Session API
- Two modes:
  - `full`: complete RoundZero interview
  - `quick_eval`: 2–3 clarifying questions for medium-fit candidates
- Interview invites expire after 48 hours via `this.schedule()` (per-interview alarm, no global cron)

**Agents SDK capabilities used:**

| Feature | How we use it | What it replaces |
|---|---|---|
| `AIChatAgent` | Interview agent class with `onChatMessage()` | Raw Durable Object + manual storage |
| `streamText()` | Token streaming to candidate | Full-response waiting |
| Tools (`tool()`) | `evaluate_answer`, `check_resume_gap`, `end_interview` | Hardcoded question limits |
| Session API | Structured context memory (job, candidate, evaluation notes) | Flat string concat |
| `this.schedule()` | Per-interview expiry alarm | Global cron polling |
| `this.runWorkflow()` | Trigger post-evaluation from agent | HTTP POST to endpoint |
| State sync | Real-time status/scores to client | Frontend polling |
| `this.queue()` | Background context refresh | Inline blocking fetch |

**Agent decision making:**
- The LLM decides when to end the interview via `end_interview` tool (no hardcoded 5-question limit)
- The agent evaluates each answer via `evaluate_answer` tool and stores running scores
- The agent checks claims against resume via `check_resume_gap` tool
- The agent triggers post-evaluation workflow directly when sufficient signal is gathered

### Interview Lifecycle Manager (Agent Scheduling)

- Each interview schedules its own expiry via `this.schedule(48h, "expireInterview")`
- On expiry: agent updates status, sends notification, triggers backfill workflow
- No global cron needed — each interview manages its own lifecycle
- Agent schedules are persisted in SQLite and survive restarts

### Report Generation Pipeline (Cloudflare Workflow)

- Triggered when interview completes (main app POSTs to `/post-evaluate`)
- Durable multi-step execution:
  1. Idempotency check (skip if report already exists)
  2. Read interview context + transcript from Durable Object state
  3. Generate report via single LLM call with structured JSON schema output
     - Fallback deterministic report when LLM returns non-JSON or invalid shape
  4. Persist report to `reports` table; update application status → `evaluated`
  5. Create in-app `report_ready` notification for company owner
  6. Send best-effort Resend email to company owner

### Output Layer

- Report reads from Postgres
- Candidate ranking per job by report score
- Company dashboard shows evaluated + pending tabs

### Key Constraint

- The AI layer sits on top of a complete hiring platform, not replacing unfinished basics

---

## 15. Near-Term Priorities

See `PLAN.md` for the full build plan. Current focus:

1. **Interview UX polish**: finish chat auto-scroll parity, duplicate-assistant safeguards, and terminal state UI polish
2. **Phase 8 wrap-up**: candidate applications list visible status labels, dedicated interview invitation cards
3. **Phase 9 polish**: mobile responsive pass, pending/evaluated tabs on job applicants
4. **Testing**: end-to-end smoke test of full apply → pre-eval → invite → interview → complete → report flow
5. **Optional**: Better Auth migration (Phase 10), Web Interface Guidelines compliance (Phase 11)

---

## 16. Post-Release Hardening (Edge / AI Layer)

| Item | Why | Approach |
| --- | --- | --- |
| Recovery sweep for stuck applications | Fire-and-forget trigger has no retry — if edge is down, applications stay in `applied` with no pre-evaluation forever | Add a cron (CF Cron Trigger or main app scheduled task) that finds `applied` rows with no `pre_evaluations` row and re-triggers them |
| Quota race condition | Two concurrent workflows can over-invite for a job if capacity checks are non-atomic | Use transactional locking (`SELECT ... FOR UPDATE`) on job-level capacity checks when creating interviews |
| LLM model adequacy | Interview chat currently uses `@cf/zai-org/glm-4.7-flash`; pre-eval/report quality can still drift by role complexity | Keep periodic score-quality checks and re-evaluate model mix if report consistency drops |
| Workflow failure orphans | If workflow errors after `write_pre_evaluation` but before `decide_next_step`, application is stuck in `pre_screening` | Recovery sweep covers this too — detect `pre_screening` rows older than N minutes with no interview |
| Edge Worker secret rotation | Shared secret is a single static value | Use a proper random secret in prod; consider HMAC request signing or CF Access Service Tokens for zero-trust |

---

## 17. Key Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Product layering | Platform first, AI second | Avoids using AI to mask workflow gaps |
| DB typing | SQLC + inference | Keeps DB layer authoritative |
| Resume persistence | `resume_key` | Stable storage reference |
| Resume delivery | Signed read URLs | Keeps resumes private |
| Resume upload | Direct-to-R2 signed upload | Avoids proxying file bytes through app server |
| Notifications | In-app notifications + Resend | Durable app record first, email as secondary delivery |
| Auth | Google OAuth + cookie session | Good enough for current phase |
| AI pipelines | Cloudflare Workflows in edge Worker | Durable multi-step execution with retries |
| Interview runtime | Cloudflare Agents SDK (`AIChatAgent`) in edge Worker | Stateful streaming chat with built-in message persistence |
| Resume text extraction | Local libraries per file type (PDF / DOCX) | LLM reads unstructured text; no external parser needed |
