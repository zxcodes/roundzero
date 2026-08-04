# RoundZero – Architecture

## 0. Status

This document reflects the current codebase: a TanStack Start hiring platform running on a single Cloudflare Worker, with the AI layer, batch orchestration, notifications, and billing integrated into the same runtime.

Implemented in the repo today:

- TanStack Start app on Cloudflare Worker
- Postgres-backed hiring platform
- role-based company and candidate workflows
- public companies and jobs browsing
- candidate profiles with resume upload
- one-click applications with profile snapshots
- in-app notifications with Cloudflare Email Service delivery
- Cloudflare Workflows for pre-evaluation, post-evaluation, batch orchestration, pool-check, eval-retry, and account-cleanup
- TanStack AI + OpenRouter text interviews (SSE via `/api/interview-chat`)
- ElevenLabs Conversational AI for voice assessment
- AI pre-evaluation, interviews, reports, and ranked batch release flow
- billing plan config, Polar checkout/webhooks, and plan-gated entitlements
- multi-tenant company auth (membership, email invitations, team management)

Important current constraints:

- the AI layer is live in code, but both `report_ready` and `batch_ready` concepts still coexist
- interview flow currently has one meaningful candidate-facing mode: `full`
- resume uploads/downloads are server-mediated; the app does not currently use signed upload/download URLs

---

## 1. Stack

| Layer              | Technology                                             |
| ------------------ | ------------------------------------------------------ |
| Framework          | TanStack Start, React 19, Vite 8                       |
| Runtime            | Cloudflare Worker                                      |
| AI Runtime         | Cloudflare Workflows                                   |
| Database           | Postgres                                               |
| Local DB           | Docker Postgres containers (`rz_pg_dev`, `rz_pg_test`) |
| Deployed DB Access | Hyperdrive binding in `wrangler.jsonc`                 |
| Data Access        | SQLC + handwritten SQL                                 |
| Migrations         | dbmate                                                 |
| Auth               | Google OAuth + cookie session                          |
| UI                 | shadcn/ui, Tailwind CSS v4, Hugeicons                  |
| Validation         | Zod                                                    |
| Storage            | Cloudflare R2                                          |
| Email              | Cloudflare Email Service (`send_email` binding)        |
| LLM Provider       | OpenRouter via Vercel AI SDK v7 + TanStack AI          |
| Tooling            | Oxlint, Oxfmt, Vitest, Knip                            |

---

## 2. Runtime Architecture

### Single Worker Runtime

The app and AI layer run together inside one Cloudflare Worker:

- `app/server.ts` is the Worker entrypoint
- TanStack Start handles the main app request flow
- Workflow bindings run pre-evaluation, post-evaluation, and batch-orchestration jobs
- the Worker scheduled handler runs pool-check (6h), eval-retry (3h), and account-cleanup (daily 04:00 UTC)
- R2 stores resumes and other assets

Why this shape:

- no cross-service HTTP hop between app, workflows, and interview runtime
- shared bindings and shared database access
- simpler deployment and local development story

### Current `app/server.ts` responsibilities

- serve the main TanStack Start app
- handle the Polar billing webhook
- serve local/public asset reads under `/api/assets/:key`
- run scheduled workflows: `PoolCheckWorkflow` (6h), `EvalRetryWorkflow` (3h), `AccountCleanupWorkflow` (daily)

---

## 3. Current Product Surface

### Routes

Current file-based routes:

```text
app/routes/
├── __root.tsx
├── _authenticated.tsx
├── _authenticated/dashboard.tsx
├── _authenticated/dashboard/applications.tsx
├── _authenticated/dashboard/applicant-reports/$applicationId.tsx
├── _authenticated/dashboard/applicants/$applicationId.tsx
├── _authenticated/dashboard/application/$applicationId.tsx
├── _authenticated/dashboard/billing.tsx
├── _authenticated/dashboard/index.tsx
├── _authenticated/dashboard/job-applicants/$jobId.tsx
├── _authenticated/dashboard/job-batches/$batchId.tsx
├── _authenticated/dashboard/jobs/new.tsx
├── _authenticated/dashboard/jobs/index.tsx
├── _authenticated/dashboard/jobs/$jobId.tsx
├── _authenticated/dashboard/settings.tsx
├── _authenticated/dashboard/team.tsx
├── _authenticated/onboarding/no-workspace.tsx
├── _authenticated/interview.tsx
├── _authenticated/interview/index.tsx
├── _authenticated/interview/$interviewId.tsx
├── _authenticated/onboarding.tsx
├── _authenticated/onboarding/candidate.tsx
├── _authenticated/onboarding/company.tsx
├── candidate/login.tsx
├── companies/index.tsx
├── companies/$slug.tsx
├── company/login.tsx
├── invite/$token.tsx
├── index.tsx
├── jobs/index.tsx
├── jobs/$jobId.tsx
├── privacy.tsx
└── tos.tsx
```

What exists in practice:

- public marketing and discovery surfaces
- company and candidate login/onboarding
- candidate application tracking
- company applicant review, reports, and batch review surfaces
- dedicated interview workspace
- billing page and team management for company users
- invitation accept flow at `/invite/$token`

---

## 4. Feature Modules

Current top-level feature modules:

```text
app/features/
├── accounts/       # deletion grace, erasure helpers
├── applications/
├── auth/
├── batches/
├── billing/
├── candidates/
├── companies/
├── dashboard/
├── entitlements/
├── interviews/
├── jobs/
├── notifications/
├── pre-evaluations/
└── reports/
```

High-level responsibilities:

- `accounts`: erasure grace config, `eraseDeletedAccount`, cleanup queries
- `applications`: apply flow, applicant lists, status transitions, workflow triggers
- `auth`: Google login, session bootstrap, soft-delete/restore, `deleteAccount`
- `batches`: pooling, launch orchestration, release, batch digest email
- `billing`: subscription plan config (`PLAN_CONFIGS`), billing page, Polar checkout + webhook integration
- `candidates`: profile CRUD, work history, resume upload contract
- `companies`: company profile CRUD, logo handling, public company data, membership, team invites
- `dashboard`: role-specific metrics and dashboard data
- `entitlements`: `deriveEntitlements()`, server enforcement, `useEntitlements()` hook
- `interviews`: interview lifecycle, routes, agent chat hooks/components, server functions
- `jobs`: job CRUD, lifecycle, requirements, screening questions
- `notifications`: inbox UI, payload rendering, email delivery
- `pre-evaluations`: pre-screening queries and server functions
- `reports`: post-evaluation reports, report pages, reusable report components

### AI-specific code

- `app/workflows/pre-evaluation/policy.ts`
- `app/workflows/pre-evaluation/steps.ts`
- `app/workflows/pre-evaluation/workflow.ts`
- `app/workflows/post-evaluation/steps.ts`
- `app/workflows/post-evaluation/workflow.ts`
- `app/workflows/batch-orchestration/workflow.ts`
- `app/workflows/pool-check/workflow.ts`
- `app/workflows/eval-retry/workflow.ts`
- `app/workflows/account-cleanup/workflow.ts`

---

## 5. Directory Conventions

```text
app/
├── routes/
├── features/
├── components/
├── shared/
├── lib/
├── workflows/
├── server.ts
├── router.tsx
└── styles.css
```

Conventions used by the codebase:

- feature-first structure
- SQL lives beside each feature in `queries/queries.sql`
- generated `queries_sql.ts` files are the typed DB boundary
- server functions are the app-facing mutation/read boundary
- shared cross-cutting helpers live in `app/shared/`

---

## 6. Database Schema

Source of truth:

- migration: `db/migrations/20260328081657_init.sql`
- schema dump: `db/schema.sql`

### Core tables

#### `users`

- Google-authenticated user identity
- role: `company` or `candidate`
- soft delete via `deleted_at`; hard erasure via `anonymized_at` after 30-day grace

#### `companies`

- owned by a company user (`owner_id` kept for billing; access is membership-based)
- stores onboarding and public company profile data
- includes public `slug`
- billing fields: `subscription_plan`, `subscription_status`, `polar_*` IDs, period end, cancel-at-period-end

#### `company_members`

- canonical company access primitive (replaces direct `owner_id` checks)
- one active membership per user (MVP)
- roles: `owner`, `admin`, `member`
- status: `active`, `removed`

#### `company_invitations`

- email invitations with opaque token, 7-day expiry
- roles: `admin`, `member` (never `owner`)
- lifecycle: pending → accepted / revoked / expired

#### `candidate_profiles`

- one per candidate user
- stores:
  - headline
  - `resume_key`
  - `resume_updated_at`
  - bio
  - skills
  - links

#### `candidate_work_history`

- separate normalized work-history rows linked to `candidate_profiles`
- stores company, title, month range, current-role flag, description, sort order

#### `jobs`

- owned by a company
- stores:
  - title, description
  - requirements
  - screening questions
  - lifecycle status (`draft`, `open`, `closed`)
  - salary / workplace / experience fields
  - `final_report_target`
  - `expires_at`, `archived_at`

#### `applications`

- unique per `(job_id, candidate_id)`
- stores:
  - `resume_key`
  - `metadata` profile snapshot
  - lifecycle status
  - `queued_at`, set only while the application is `queued_for_batch`

Current application statuses:

- `applied`
- `pre_screening`
- `queued_for_batch`
- `interview_invited`
- `interview_in_progress`
- `evaluated`
- `evaluated_held`
- `shortlisted`
- `rejected`
- `withdrawn`
- `evaluation_failed`

Architecturally:

- `candidate_profiles` is the live profile source of truth
- `applications.metadata` is the apply-time snapshot

#### `pre_evaluations`

- one row per application
- stores:
  - `score`
  - `missing_requirements`
  - `confidence`
  - `next_step` (`interview_invited` or `hold`)
  - `consistency_score`
  - `raw_response`

#### `job_batches`

- groups interviews into ranked batch releases
- a partial unique index permits at most one `forming` or `active` batch per job
- stores:
  - `status` (`forming`, `active`, `released`)
  - `target_size`
  - `launched_at`, `released_at`

#### `interviews`

- links applications to interview sessions
- unique per application; expired/cancelled rows are reset for a later attempt instead of inserting a second row
- stores:
  - `type` (currently `full` in active flows)
  - `status` (`pending`, `in_progress`, `awaiting_voice`, `completed`, `expired`, `cancelled`)
  - `batch_id`
  - `metadata`
  - `invited_at`, `started_at`, `completed_at`, `expired_at`, `cancelled_at`

#### `communication_assessments`

- one row per interview
- stores voice assessment status and results
- stores:
  - `status` (`pending`, `in_progress`, `completed`, `skipped`)
  - `transcript` — full conversation transcript
  - `analysis` — 5-dimension scores with evidence
  - `audio_key`

#### `reports`

- stores final evaluation output
- stores:
  - summary
  - strengths, weaknesses, insights, evidence
  - screening answers
  - scores
  - recommendation
  - `released_at`

### Schema decisions

- app-domain enum-like values are validated in app code with Zod
- SQLC is the typed query boundary
- no triggers
- `updated_at` is set explicitly in update queries
- JSONB columns are stored as raw JS objects/arrays, not stringified JSON

---

## 7. Query and Type Strategy

Data flow pattern:

1. SQL query lives in `queries.sql`
2. SQLC generates a typed function in `queries_sql.ts`
3. feature server functions add business logic and auth rules
4. routes/loaders call server functions
5. components infer types from loader or server-function results

Rules reflected in the codebase:

- generated SQLC files are never hand-edited
- no manual duplicate DB shape types where inference is possible
- JSONB is passed around as raw JS values

---

## 8. Auth Architecture

Current auth flow:

1. user hits a role-specific login route
2. Google OAuth succeeds
3. server upserts the user
4. session cookie is written
5. role determines onboarding and dashboard paths

Company access uses **membership**, not `owner_id` alone:

- `companyMiddleware` resolves `{ company, membership }` via active `company_members` row
- `_authenticated` `beforeLoad` derives entitlements for company users with an active workspace
- invite accept at `/invite/$token` creates membership after Google sign-in + email match
- MVP blocks: same email as candidate account, existing active membership elsewhere

Characteristics:

- cookie session, not DB-backed session storage
- session config lives in `app/shared/session.ts`
- current cookie name: `rz-session`
- session max age: 30 days

---

## 9. Application Flow

### Candidate profile + resume

1. candidate completes onboarding
2. candidate uploads a resume through the app
3. app stores `resume_key` on `candidate_profiles`
4. candidate can maintain profile, work history, links, and skills in settings

### Applying

1. candidate selects a job
2. app checks duplicate-application rules
3. app requires a resume on the candidate profile
4. app creates an application row
5. application snapshots:
   - `resume_key`
   - structured profile metadata
6. pre-evaluation workflow is triggered asynchronously

### Company review

1. company views a job or applicant surface
2. company navigates into applicant or report routes
3. company sees snapshot data, resume, workflow status, and evaluation output
4. company updates application status from those surfaces

---

## 10. Asset and Resume Storage

Resume handling is `resume_key`-first, not URL-first.

### Current model

- the DB stores `resume_key`, not `resume_url`
- R2 is the canonical object store
- candidate and company resume access is mediated by server functions
- local/public asset reads can also go through `/api/assets/:key` or `VITE_PUBLIC_ASSET_BASE_URL`

### Current candidate resume server functions

- `uploadResume`
- `getResume`

### Current company/application resume server function

- `getApplicationResume`

### Current flow

1. client picks a file
2. server builds a user-scoped key:
   - `resumes/<userId>/<uuid>--<sanitized-file-name>.<ext>`
3. client sends base64 file bytes to the server function
4. server writes the object with `env.RESUMES.put(...)`
5. server stores `resume_key` on the candidate profile
6. candidate/company reads fetch object bytes back through server functions

Why `resume_key` instead of `resume_url`:

- stable internal storage reference
- DB remains decoupled from delivery URL format
- easier to change delivery strategy later

---

## 11. Notifications Architecture

Notifications are durable in-app records first, with Cloudflare Email Service as a secondary delivery channel.

### Notifications table

`notifications` stores:

- `user_id`
- `type`
- `payload`
- `read_at`
- email delivery status/error/attempt timestamps
- provider message id
- optional `dedupe_key`; `(user_id, type, dedupe_key)` is unique when present
- `created_at`

### Supported notification types in code

- `application_status_changed`
- `application_withdrawn`
- `batch_ready`
- `report_ready`
- `interview_invited`
- `position_filled`
- `job_published`
- `job_archived`
- `job_closed`

### Current delivery model

- create DB notification row first
- render that row in the in-app inbox
- optionally send email for selected event types
- persist email delivery result directly on the same row

Current email-backed use cases include:

- interview invited
- application status changed
- application withdrawn
- report ready
- batch ready digest

Design principle:

- in-app notification is canonical
- email is a transport, not the source of truth

---

## 12. Job and Batch Lifecycle

Jobs support:

- `draft`, `open`, `closed`
- archive behavior
- `expires_at`
- auto-close behavior for expired jobs
- screening questions stored in JSONB

Batch-oriented evaluation adds:

- `queued_for_batch` application status
- `job_batches`
- `evaluated_held` until release
- batch release and backfill logic

`final_report_target` caps delivered plus reserved reports for a job. A pending, in-progress, awaiting-voice, or completed interview reserves one slot until its report is released or the unfinished work is conditionally cancelled/expired. Waitlisted applications reserve nothing. Targets are bounded by the plan when created, published, or increased and cannot decrease; a plan downgrade does not invalidate existing commitments.

---

## 13. Billing, Plans, and Entitlements

### Plans

Source of truth: `app/features/billing/config.ts` (`PLAN_CONFIGS`).

| Plan    | Price   | Active jobs | Reports/job | Teammates (+ owner) |
| ------- | ------- | ----------- | ----------- | ------------------- |
| Free    | $0      | 1           | 5           | 1                   |
| Starter | $39/mo  | 5           | 15          | 2                   |
| Growth  | $99/mo  | 15          | 25          | 4                   |
| Scale   | $249/mo | 35          | 50          | 10                  |

Paid features require `hasActiveSubscription()` — plan is not `free` and status is `active` or `trialing`.

### Entitlements

`deriveEntitlements()` in `app/features/entitlements/entitlements.ts` is the single source of truth. Inputs: plan, subscription status, open/draft job counts, team slot counts.

Gated capabilities:

| Entitlement       | Rule                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `jobs.open`       | `open` jobs count toward limit; drafts never consume a slot                                                         |
| `reports` per job | target defaults to 10 or the plan limit when lower; new values must be within the current limit and cannot decrease |
| `team.invite`     | non-owner members + pending invites count toward limit                                                              |
| `team.accept`     | gated on non-owner member count (owner excluded)                                                                    |
| `aiJobCreation`   | paid plans only                                                                                                     |
| `jobImport`       | active/trialing Growth or Scale subscription only                                                                   |

### Enforcement layers

1. **Router context** — `_authenticated` `beforeLoad` exposes `entitlements` for UI gating (`useEntitlements()`)
2. **Server boundary** — `readCompanyEntitlements()` / `enforceCompanyEntitlement()` always read fresh DB state (never stale loader snapshots)
3. **Report targets** — entitlement validation at create/publish/update plus a locked, conditional increase at the database transaction boundary

### Polar integration

- Checkout + customer portal via Polar API (`POLAR_ACCESS_TOKEN`)
- Webhook in `app/server.ts` updates `companies.subscription_*` fields
- Product IDs: `POLAR_PRODUCT_ID_STARTER`, `POLAR_PRODUCT_ID_GROWTH`, `POLAR_PRODUCT_ID_SCALE`

---

## 14. Testing Architecture

Two local Postgres containers:

| Container    | Port | Purpose     |
| ------------ | ---- | ----------- |
| `rz_pg_dev`  | 6311 | development |
| `rz_pg_test` | 6312 | tests       |

Testing approach:

- real Postgres for query/business-logic tests
- shared setup handles cleanup
- seed helpers create minimal valid records
- targeted Vitest coverage across feature query layers and workflow logic

Current high-value AI-layer coverage areas:

- pre-evaluation prompt/policy helpers
- interview query/state transitions
- notification payload handling
- batch formation and release logic

---

## 15. AI Architecture

The AI layer runs inside the same Worker as the app.

### Pre-Evaluation Workflow

Triggered from the application flow. Steps:

1. read application + job from Postgres
2. fetch resume from R2
3. extract text from PDF or DOCX
4. combine job context, profile snapshot, and resume text
5. classify job type
6. run authenticity / consistency check
7. run role-specific pre-evaluation
8. persist `pre_evaluations`
9. under the job lock, decide whether quota is exhausted or the candidate can join the waitlist

### Text Interview

Hybrid TanStack AI + OpenRouter:

- `startMyInterview` — server function; generates first greeting (`chat()`, non-streaming)
- `POST /api/interview-chat` — SSE streaming route for subsequent turns (`toServerSentEventsResponse`)
- Server-side tool loop: `check_resume_gap`, `record_screening_coverage`, `end_interview` (`maxIterations(5)`)
- `getMyInterview` / `getMyInterviewMessages` — status + transcript reads
- System prompt via `buildInterviewSystemPrompt()` (job, candidate, pre-eval, screening coverage)
- Models from `getModelChain("interview")` with OpenRouter `models` fallbacks in `modelOptions`
- Text submit (`completeMyInterview` or `end_interview` tool) → `awaiting_voice`; post-eval waits for voice

### Voice Assessment

The voice assessment uses ElevenLabs' Conversational AI:

- ElevenLabs handles all voice processing (STT, LLM, TTS) as a managed service
- `getMyVoiceToken` is available only while `interviews.status === 'awaiting_voice'`
- `getMyVoiceToken` generates a signed URL via `fetch` to the ElevenLabs REST API for client-side session initiation
- Candidate/job context is injected via ElevenLabs `dynamicVariables` (`candidate_name`, `job_title`, `company_name`, `candidate_summary`)
- The client connects via `@elevenlabs/client` `Conversation.startSession()` using the signed URL
- `finalizeVoiceAssessmentFromTranscript` (ElevenLabs webhook or browser fallback) persists transcript with `analysis: null`, moves interview to `completed`, calls `startPostEvaluation`
- Voice dimension analysis (`analyzeVoiceTranscript`) runs inside post-evaluation `load_voice_assessment`, not on the hot path
- Communication score blend is evidence-weighted in `applyVoiceAssessmentToReport()` (not fixed 60/40)

The agent's system prompt and voice personality are configured in the ElevenLabs dashboard.

### Post-Evaluation Workflow

Started by `startPostEvaluation` only when **both** `interviews.status === 'completed'` and `communication_assessments.status === 'completed'`. Steps:

1. idempotency check (existing report short-circuit)
2. read interview context and transcript; fail if voice assessment is missing or incomplete
3. load voice analysis (LLM over stored transcript)
4. generate structured report with LLM
5. refine and persist report
6. reconcile atomically against the locked batch: hold before release, or release immediately if the batch already released
7. send an idempotent per-report notification only for an immediate/late release; normal batch release uses its digest

Interview expiry does not start post-evaluation (partial text-only sessions have no report).

### Batch Orchestration Workflow

Batch release is a first-class workflow:

1. candidates accumulate in a per-job pool (`queued_for_batch`)
2. pool checks run on pre-eval completion and on the Worker scheduled handler
3. under a job-row lock, capacity is `target - delivered - reserved`; launch claims at most the remaining capacity, configured batch size, and pool size
4. launch atomically creates one active batch, resets/creates one interview per claimed application, and creates deduplicated invite notifications
5. completed reports are held at `evaluated_held` until batch release; report persistence and release serialize on the batch row, so a late report releases immediately instead of becoming stranded
6. timeout expires only due `pending | in_progress` interviews; `awaiting_voice` continues reserving its slot
7. release sends one deduplicated `batch_ready` digest and checks for backfill after commit

State-changing operations use a global lock order to avoid deadlocks: job admission locks `job → application → interview`; batch operations lock `batch → application → interview`; standalone withdrawal/cancellation locks `application → interview`. Backfill never acquires a job lock from inside a batch transaction; it runs after commit.

### Scheduled handlers (`app/server.ts`)

| Cron          | Workflow                 | Purpose                                    |
| ------------- | ------------------------ | ------------------------------------------ |
| `0 */6 * * *` | `PoolCheckWorkflow`      | Re-check batch pools for all open jobs     |
| `0 */3 * * *` | `EvalRetryWorkflow`      | Retry stuck/failed evaluations             |
| `0 4 * * *`   | `AccountCleanupWorkflow` | Erase soft-deleted users past 30-day grace |

### Account deletion architecture

1. `deleteAccount` → `softDeleteUser` (`users.deleted_at`)
2. Login during grace → `restoreUser` (Google OAuth flow in `auth/server/functions.ts`)
3. Daily `AccountCleanupWorkflow` → `listAccountsPendingErasure` → `eraseDeletedAccount` per user
4. Erasure: R2 delete, PII scrub, report text redaction (scores preserved), `anonymizeUser`, sole-owner job archive

Config: `app/features/accounts/config.ts` (`ACCOUNT_ERASURE_GRACE_DAYS = 30`, `ACCOUNT_CLEANUP_SWEEP_LIMIT = 50`).

### Current AI-layer outputs

- `pre_evaluations`
- `interviews`
- `communication_assessments`
- `reports`
- `job_batches`
- applicant and batch notifications

---

## 16. Near-Term Priorities

See `PLAN.md` for the full build plan. Based on the current architecture, likely near-term hardening areas are:

1. align remaining per-candidate `report_ready` and batch `batch_ready` semantics
2. polish candidate interview UX and terminal states
3. continue AI prompt/policy calibration
4. expand end-to-end workflow coverage
5. multi-tenant polish (notification fan-out, owner transfer, leave-org)

---

## 17. Post-Release Hardening

| Item                                  | Why                                                      | Approach                                                        |
| ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| Recovery sweep for stuck applications | async workflow triggers can still fail around edges      | scheduled recovery for stale `applied` / `pre_screening` rows   |
| Batch / quota race conditions         | concurrency around invites and release can over-allocate | keep job-level locking and idempotent release checks            |
| AI quality drift                      | prompts and model mix can regress                        | periodic audit of score/report consistency and routing behavior |
| Workflow failure orphans              | partial workflow completion can strand rows              | recovery sweeps plus idempotent re-entry                        |

---

## 18. Deployment

### Environments

| Env        | Branch    | URL                        | Workers Plan                   |
| ---------- | --------- | -------------------------- | ------------------------------ |
| staging    | `staging` | `staging.tryroundzero.com` | Paid (or Free if < 3 MiB gzip) |
| production | `main`    | `tryroundzero.com`         | Paid                           |

### CI/CD

GitHub Actions workflow at `.github/workflows/deploy.yml`.

Triggers:

- push to `staging` or `main`
- `workflow_dispatch` (manual) from Actions tab

Pipeline:

1. `bun install --frozen-lockfile`
2. `bun run check` — format (Oxfmt) + lint (Oxlint) + typecheck
3. create `.env.ci` from GitHub environment secrets
4. `bun run db:migrate` — run dbmate against Neon DB
5. `vite build && wrangler deploy --env <env> --secrets-file .env.ci`

Secrets are uploaded alongside code via `--secrets-file`, not pre-set with `wrangler secret put`.

### First-time setup

```bash
# 1. Create GitHub environments and set secrets
gh secret set --env staging --env-file .env.staging
gh secret set --env production --env-file .env.production
# Note: CLOUDFLARE_API_TOKEN must be set manually per environment
gh secret set --env staging CLOUDFLARE_API_TOKEN

# 2. Create staging branch and push
git checkout -b staging
git push origin staging

# 3. Create Hyperdrive config for staging Neon DB
# (One-time — paste the resulting UUID into wrangler.jsonc env.staging.hyperdrive.id)
wrangler hyperdrive create roundzero-db-staging \
  --connection-string="postgresql://neondb_owner:...@...neon.tech/neondb?sslmode=require"

# 4. Push main when ready for production
# (Create production Neon DB + Hyperdrive config first)
```

### Required GitHub secrets (per environment)

| Secret                       | Purpose                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Postgres connection string for dbmate migrations                                      |
| `SESSION_SECRET`             | Cookie signing key                                                                    |
| `APP_URL`                    | Canonical app URL (`https://staging.tryroundzero.com`)                                |
| `EMAIL_FROM`                 | Transactional email from address (Cloudflare Email Service; domain must be onboarded) |
| `OPENROUTER_API_KEY`         | LLM inference                                                                         |
| `AI_GATEWAY_TOKEN`           | Cloudflare AI Gateway                                                                 |
| `POLAR_ACCESS_TOKEN`         | Billing API                                                                           |
| `POLAR_WEBHOOK_SECRET`       | Billing webhook verification                                                          |
| `POLAR_PRODUCT_ID_STARTER`   | Polar Starter plan product ID                                                         |
| `POLAR_PRODUCT_ID_GROWTH`    | Polar Growth plan product ID                                                          |
| `POLAR_PRODUCT_ID_SCALE`     | Polar Scale plan product ID                                                           |
| `ELEVENLABS_API_KEY`         | Voice assessment                                                                      |
| `ELEVENLABS_AGENT_ID`        | Voice agent config                                                                    |
| `ELEVENLABS_WEBHOOK_SECRET`  | Voice webhook verification                                                            |
| `VITE_GOOGLE_CLIENT_ID`      | Google OAuth client ID                                                                |
| `VITE_APP_URL`               | Client-side app URL                                                                   |
| `VITE_PUBLIC_ASSET_BASE_URL` | R2 asset CDN domain (optional)                                                        |
| `CLOUDFLARE_API_TOKEN`       | Wrangler deploy auth (Workers: Edit permission)                                       |

### Local secrets

`.env` — local dev only, never committed (covered by `.gitignore`).
`.env.staging` / `.env.production` — environment-specific values, never committed (covered by `.env.*` in `.gitignore`).

---

## 19. Key Decisions

| Decision           | Choice                                                 | Rationale                                                   |
| ------------------ | ------------------------------------------------------ | ----------------------------------------------------------- |
| Product layering   | Platform first, AI second                              | AI should sit on top of a credible hiring workflow          |
| Runtime            | Single Cloudflare Worker                               | shared bindings, simpler local/dev/prod flow                |
| DB typing          | SQLC + inference                                       | keeps SQL authoritative                                     |
| Resume persistence | `resume_key`                                           | stable storage reference                                    |
| Resume upload      | server-mediated R2 writes                              | simplest current contract                                   |
| Resume delivery    | server-mediated reads + asset endpoint/public base URL | flexible delivery without DB URL coupling                   |
| Notifications      | DB-first in-app records + Cloudflare Email             | durable record first, email second                          |
| Auth               | Google OAuth + cookie session                          | sufficient for current scope                                |
| AI orchestration   | Cloudflare Workflows                                   | durable multi-step execution                                |
| Interview runtime  | TanStack server functions + OpenRouter                 | request-response chat via server functions                  |
| Company access     | `company_members` membership                           | supports multi-user teams; `owner_id` kept for billing      |
| Plan gating        | `deriveEntitlements()` + server enforcement            | single source of truth; fresh DB reads at mutation boundary |
