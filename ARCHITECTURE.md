# RoundZero – Architecture

## 0. Status

This document reflects the app in its **current platform-first state**.

Today, RoundZero is primarily:

- a TanStack Start application
- a Postgres-backed hiring platform
- role-based company/candidate workflows
- public company and jobs browsing
- one-click applications with profile snapshots

The AI interview, evaluation, report, and ranking layers are planned but not yet implemented in this codebase.

---

## 1. Stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start (React 19, Vite 7) |
| Runtime (current) | TanStack Start server functions |
| Runtime (target AI phase) | Cloudflare Workers + Wrangler |
| Database | Postgres (Docker locally, Neon intended for prod) |
| Typed queries | SQLC |
| Migrations | dbmate |
| Auth | Google OAuth with server-side cookie session |
| UI | shadcn/ui, Tailwind CSS v4, Hugeicons |
| Validation | Zod |
| Notifications | In-app inbox now, Resend planned for email delivery |
| File storage (planned/current contract) | Cloudflare R2 |
| AI layer (planned) | Cloudflare Agents SDK + Vercel AI SDK |
| Linting | Biome |

---

## 2. Current Runtime vs Target Runtime

### Current Runtime

The app currently runs as a standard TanStack Start app with server functions for:

- auth
- jobs
- applications
- company profile management
- candidate profile management
- dashboard metrics

### Target Runtime

The AI layer is expected to move the app toward Cloudflare deployment with:

- TanStack Start on Workers
- Durable Objects for interview/evaluation agents
- R2 for resume storage
- AI binding / model provider integration

The codebase should therefore prefer boundaries that survive that migration cleanly:

- explicit server functions
- storage behind server contracts
- database-centric source of truth

---

## 3. Current Product Surface

## Routes

Current file-based routes:

```
app/routes/
├── __root.tsx
├── index.tsx
├── company/login.tsx
├── candidate/login.tsx
├── companies/index.tsx
├── companies/$slug.tsx
├── jobs/index.tsx
├── jobs/$jobId.tsx
├── _authenticated.tsx
├── _authenticated/onboarding.tsx
├── _authenticated/onboarding/company.tsx
├── _authenticated/onboarding/candidate.tsx
├── _authenticated/dashboard.tsx
├── _authenticated/dashboard/index.tsx
├── _authenticated/dashboard/jobs/index.tsx
├── _authenticated/dashboard/jobs/$jobId.tsx
├── _authenticated/dashboard/applications.tsx
└── _authenticated/dashboard/settings.tsx
```

What this means in practice:

- public browsing exists
- role-specific login exists
- company/candidate onboarding exists
- dashboard basics exist
- applicant review exists at the per-job level
- candidate application tracking exists

Missing route surface today:

- interview UI
- evaluation/report UI
- company candidate detail/workbench route
- notification center

---

## 4. Current Feature Modules

```
app/features/
├── auth/
├── applications/
├── candidates/
├── companies/
├── dashboard/
├── notifications/
└── jobs/
```

### What exists

- `auth`: login/session/provider/query layer
- `companies`: company CRUD/settings/public data
- `candidates`: candidate profile/settings and resume contract
- `jobs`: job CRUD, filtering, pagination, status/archive behavior
- `applications`: one-click apply, applicant lists, application status
- `dashboard`: role-specific metrics
- `notifications`: per-user in-app notification inbox and workflow event records

### What does not exist yet

- `interviews/`
- `reports/`
- `ranking/`
- `agents/`

Those modules were part of the original target architecture, but the codebase is not there yet.

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
  - `expires_at`
  - `archived_at`

#### `applications`

- unique per `(job_id, candidate_id)`
- stores:
  - `resume_key` snapshot
  - `metadata` snapshot for non-resume candidate profile data
  - status

This is important architecturally:

- `candidate_profiles` is the current source of truth
- `applications` is the apply-time snapshot

#### `interviews`

- planned future link between applications and AI interview sessions
- table exists, but interview runtime is not built yet

#### `reports`

- planned future evaluation output
- table exists, but report generation and views are not built yet

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

1. Company views a job
2. sees applicant list
3. sees basic candidate info + snapshot-derived links
4. updates application status

This is functional, but still missing a stronger company-side applicant detail/workbench.

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

- Today this runs via the S3-compatible R2 API from the app server using account credentials and presigned `PUT`/`GET` URLs.
- When more of the platform moves onto Cloudflare Workers, the browser contract can stay the same while server-side storage internals move to Workers-native bindings where useful.

Why `resume_key` instead of `resume_url`:

- stable internal reference
- avoids coupling DB state to delivery URL format
- easier to move between CDN/signed URL strategies later

---

## 11. Notifications Architecture

Notifications are now partially implemented as a durable in-app inbox. Email delivery is still a later layer, but the architecture continues to treat in-app notification records as the primary system of record.

Recommended provider:

- **Resend**

Recommended use cases:

- application submitted confirmation
- interview ready / interview reminder
- application status updates
- company-side applicant activity notifications

Recommended architecture:

- write a notification record to the database first
- treat in-app notifications as the primary system of record
- send email as a secondary best-effort delivery channel for selected events
- keep notification sending behind server-side functions/services
- trigger notifications from explicit workflow events, not UI-only actions
- do not couple domain logic directly to a provider SDK in routes/components

Recommended future data model:

- `notifications`
  - `id`
  - `user_id`
  - `type`
  - `title`
  - `body`
  - `link`
  - `read_at`
  - `email_status` (optional)
  - `created_at`

Design principle:

- if email delivery fails, the notification still exists in-app
- email is a transport, not the canonical event record

Suggested future module:

```
app/features/notifications/
├── server/
│   └── functions.ts
└── services/
    ├── notification-events.ts
    └── resend.ts
```

---

## 12. Job Lifecycle Architecture

Jobs already support:

- draft/open/closed states
- archive behavior
- `expires_at`

Still missing at the product layer:

- expiry controls in the create/edit UI
- stale role indicators
- auto-close behavior for expired roles
- consistent hidden-by-default behavior for expired/closed jobs on public surfaces

This means the schema is ahead of the UX and workflow implementation.

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
- dashboard metrics

Coverage still needed as the platform hardening phase continues:

- resume upload contract behavior
- expiry lifecycle behavior
- applicant detail surfaces
- public job detail apply behavior

---

## 14. Planned AI Architecture

This is the intended future architecture, not the current app state.

### Interview Layer

- async in-app chat
- likely Durable Object per interview session
- resume/job context injected into system prompt
- adaptive questioning

### Evaluation Layer

- separate evaluation pipeline after interview completion
- multi-pass scoring:
  - technical
  - communication
  - experience validation
  - consistency

### Output Layer

- report generation
- candidate ranking per job
- explainable recommendations for companies

The important constraint:

- this AI layer should sit on top of a complete hiring platform, not replace unfinished platform basics

---

## 15. Near-Term Priorities Before AI

Architecturally, the next critical non-AI work is:

1. real R2 wiring for resumes
2. consistent apply flow from every candidate surface
3. complete job expiry/stale lifecycle
4. stronger company applicant review workflow
5. clearer candidate application tracking
6. durable in-app notification layer with optional Resend email delivery

---

## 16. Key Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Product layering | Platform first, AI second | Avoids using AI to mask workflow gaps |
| DB typing | SQLC + inference | Keeps DB layer authoritative |
| Resume persistence | `resume_key` | Stable storage reference |
| Resume delivery | Signed read URLs | Keeps resumes private |
| Resume upload | Direct-to-R2 signed upload | Avoids proxying file bytes through app server |
| Notifications | In-app notifications + Resend | Durable app record first, email as secondary delivery |
| Auth | Google OAuth + cookie session | Good enough for current phase |
| Future AI runtime | Cloudflare Durable Objects | Good fit for async conversational state |
