# Hirely — Build Plan

## Phase 0: Foundation Setup

- [x] Project scaffold (TanStack Start, Vite, React 19)
- [x] Rename `src/` to `app/`, configure `srcDirectory`
- [x] Biome config (lint + format)
- [x] SQLC config (skeleton)
- [x] DB setup script (`setup-db.sh`, Docker Postgres)
- [x] shadcn/ui setup (Tailwind v4, Radix, theme tokens)
- [x] SSR-safe dark mode (cookie-based theme provider)
- [x] Landing page (hero, interview mock, report mock, ranking mock, CTA)
- [x] `AGENTS.md`, `ARCHITECTURE.md`, `PLATFORM.md`, `README.md`

## Phase 1: Database & Auth

- [x] Postgres schema (`db/schema.sql`, `db/init.sql`)
- [x] dbmate migration (`db/migrations/20260328081657_init.sql`)
- [x] DB client (`app/shared/db.ts`)
- [x] SQLC queries for users table
- [x] Google OAuth (server-side, access token → user info → upsert)
- [x] Session management (encrypted httpOnly cookies)
- [x] Auth context provider (`app/features/auth/provider.tsx`)
- [x] Login page (`app/routes/login.tsx`)
- [x] Role selection (company / candidate) on first login
- [x] Zod enums for all domain values (`app/shared/enums.ts`)

## Phase 2: Jobs & Applications

- [x] SQLC queries for companies table
- [x] Company creation flow (post-login, if role = company)
- [x] Dashboard layout with sidebar (`_authenticated.tsx`, shadcn sidebar)
- [x] SQLC queries for jobs table (create, list by company, get by ID, update, archive, open jobs)
- [x] Job server functions (createJob, getMyJobs, getJob, updateJob, archiveJob, getOpenJobs)
- [x] Job form component (reusable for create/edit, dynamic requirements list)
- [x] Dashboard jobs list — role-aware (company: management table, candidate: browse grid)
- [x] Job detail page — role-aware (company: edit/archive, candidate: read-only + apply placeholder)
- [x] New job page (`/dashboard/jobs/new`)
- [x] Error boundary + not found components (defaultErrorComponent, defaultNotFoundComponent, root notFoundComponent)
- [x] SQLC queries for applications table
- [x] Application server functions (apply, list my applications, list applicants per job)
- [x] Application form (resume URL + optional links)
- [x] Wire "Apply" button on job detail to application flow (hasApplied check, apply form, success state)
- [x] Candidate "My Applications" page (`/dashboard/applications`)
- [x] Company applicants view per job (on job detail page, with candidate info)
- [x] Application status tracking (company can update via dropdown)
- [ ] Resume upload to Cloudflare R2 (presigned URL flow) — deferred to Phase 3

## Phase 3: AI Interview

- [ ] Switch runtime from Nitro to Cloudflare Workers (`@cloudflare/vite-plugin`)
- [ ] `wrangler.jsonc` config (Durable Objects, AI binding, R2 bucket)
- [ ] InterviewAgent (`app/agents/interview-agent.ts`, extends AIChatAgent)
- [ ] System prompt construction (job requirements + resume context)
- [ ] Agent tools: `updateStage`, `flagInconsistency`, `completeInterview`
- [ ] Interview creation (row in DB + Durable Object instantiation)
- [ ] Interview chat UI (`app/features/interviews/components/interview-chat.tsx`)
- [ ] `useAgentChat` integration (WebSocket, resumable streams)
- [ ] Interview status page (`app/routes/interview.$interviewId.tsx`)
- [ ] Resume extraction and context injection into agent
- [ ] Interview progress tracking (stage transitions, question count)
- [ ] Time/question limits enforcement

## Phase 4: Evaluation & Reports

- [ ] EvaluationAgent (`app/agents/evaluation-agent.ts`, extends Agent)
- [ ] Trigger evaluation when interview completes
- [ ] Technical assessment pass (depth, correctness, reasoning)
- [ ] Communication assessment pass (clarity, structure, articulation)
- [ ] Experience validation pass (ownership vs. contribution, verified claims)
- [ ] Consistency check pass (contradictions, resume-vs-interview mismatches)
- [ ] Score aggregation (weighted final score)
- [ ] Report generation and write to Postgres
- [ ] SQLC queries for reports table
- [ ] Report detail view (`app/routes/report.$reportId.tsx`)
- [ ] Company dashboard: candidate list per job (`app/routes/dashboard.candidates.$candidateId.tsx`)
- [ ] Ranked candidate list with scores + recommendations

## Phase 5: Polish & Extras

- [ ] Candidate-facing interview status tracking
- [ ] Email notifications (interview ready, report available)
- [ ] Analytics (time-to-hire, funnel metrics)
- [ ] Company-specific evaluation tuning (weight adjustments)
- [ ] Full transcript view for companies (optional)
- [ ] Error handling and edge cases (expired interviews, failed evaluations)
- [ ] Loading states and optimistic UI
- [ ] Mobile responsiveness pass

## Phase 6 (Optional): Migrate to Better Auth

Replaces the hand-rolled Google OAuth + encrypted cookie session system with Better Auth. Unlocks magic links, email/password, 2FA, and other auth methods without custom implementation.

### Why

- Current auth only supports Google OAuth. Adding magic links, email/password, or passkeys would require building token generation, email sending, verification flows, and rate limiting from scratch.
- Better Auth handles all of this out of the box with a plugin system.

### Key facts

- Better Auth maps to existing tables via `modelName` and `fields` — no table name conflicts.
- Custom columns (`role`, `google_id`, `picture`) are exposed via `additionalFields` with `input: false`.
- Uses `pg` (node-postgres) internally via Kysely — add `pg` as a dependency for Better Auth's connection. SQLC queries continue using `postgres` (postgres.js) unchanged.
- TanStack Start integration exists: `tanstackStartCookies` plugin + `/api/auth/$` route handler.
- `kysely-postgres-js` is an alternative if you want a single DB driver, but adding `pg` just for Better Auth is simpler.

### Migration tasks

- [ ] Install `better-auth` and `pg`
- [ ] Add Better Auth tables to init migration: `account`, `session`, `verification` (Better Auth core schema)
- [ ] Add `email_verified` column to `users` table (Better Auth expects this; map `picture` → `image` via `fields`)
- [ ] Create `app/shared/auth.ts` — Better Auth server instance:
  - `database: new Pool({ connectionString: process.env.DATABASE_URL })`
  - `user.modelName: "users"` (use existing table)
  - `user.fields` mapping: `createdAt` → `created_at`, `updatedAt` → `updated_at`, `image` → `picture`
  - `user.additionalFields`: `role` (type: `["company", "candidate"]`, `input: false`), `google_id` (type: `string`)
  - `advanced.database.generateId: false` (let Postgres `gen_random_uuid()` handle IDs)
  - `socialProviders.google` with client ID + secret
  - `plugins: [tanstackStartCookies()]` (must be last plugin)
- [ ] Create `app/shared/auth-client.ts` — Better Auth client instance (`createAuthClient` from `better-auth/react`)
- [ ] Create API route handler (`app/routes/api/auth/$.ts`) — catches all `/api/auth/*` requests
- [ ] Create `getSession` / `ensureSession` server functions using `auth.api.getSession({ headers })`
- [ ] Replace `@react-oauth/google` client-side flow with `authClient.signIn.social({ provider: "google" })`
- [ ] Replace custom `loginWithGoogle` server function with Better Auth's built-in Google OAuth flow
- [ ] Replace `useSession`/`updateSession`/`clearSession` (TanStack Start built-in) with Better Auth session management
- [ ] Update `authMiddleware` to use `auth.api.getSession({ headers })` instead of reading encrypted cookie directly
- [ ] Update `companyMiddleware` to read `session.user.id` from Better Auth session
- [ ] Update `_authenticated.tsx` `beforeLoad` to use new `getSession` server function
- [ ] Update `__root.tsx` `beforeLoad` to use new `getSession` for router context
- [ ] Remove `app/shared/session.ts` (no longer needed — Better Auth manages sessions)
- [ ] Remove `@react-oauth/google` dependency
- [ ] Remove `SESSION_SECRET` env var (Better Auth uses `BETTER_AUTH_SECRET` instead)
- [ ] Add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_SECRET` to `.env.example`
- [ ] Run `bash setup-db.sh reset_pg` to recreate DB with new schema
- [ ] Update tests — auth query tests need to account for new `account`/`session`/`verification` tables
- [ ] (Optional) Add magic link plugin: `magicLink()` server plugin + email sending via Resend/SES
- [ ] (Optional) Add email/password plugin: `emailAndPassword: { enabled: true }`
- [ ] (Optional) Add 2FA plugin: `twoFactor()` for TOTP/OTP
