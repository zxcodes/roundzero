# RoundZero — Build Plan

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
- [x] Resume upload to Cloudflare R2 (signed upload/read flow)

## Phase 3: Product Solidification

Solidify RoundZero as a usable job platform before adding AI. Public browsing, proper onboarding, company profiles, one-click apply, job expiry.

### Decisions

| Topic | Decision |
|---|---|
| Login separation | Separate entry URLs: `/company/login` and `/candidate/login` |
| Dual roles | One account = one role |
| Wrong-URL login | Redirect to correct dashboard with toast |
| Public URL structure | Marketing landing at `/` + public `/companies` directory + public `/jobs` board |
| Company profile fields | Full: name, description, logo, website, industry, size, founded year, location(s), tech stack (tags), culture/perks, social links |
| Company onboarding | Minimal: name, logo, industry, size, short description — rest in profile settings |
| Candidate onboarding | Name (pre-filled from Google) + headline + resume upload |
| Apply flow | True one-click: button only, uses resume from candidate profile |
| Job expiry | Optional `expires_at` on jobs + stale indicator after 90 days |
| Resume storage | CF R2 with signed upload/read URLs |
| Login messaging | Tailored copy per role (company: "Start hiring smarter", candidate: "Find your next role") |

### Sub-project 1: Schema + Auth Changes ✅

- [x] Extend `companies` table: add `logo_url`, `website`, `industry`, `company_size`, `founded_year`, `location`, `tech_stack` (JSONB), `culture`, `social_links` (JSONB), `updated_at`
- [x] Create `candidate_profiles` table: `user_id` (FK), `headline`, `resume_key` (originally `resume_url`, later migrated to `resume_key`), `bio`, `skills` (JSONB), `links` (JSONB), `created_at`, `updated_at`
- [x] Add `expires_at` (TIMESTAMPTZ, nullable) to `jobs` table
- [x] Add `slug` (TEXT UNIQUE) to `companies` table for public URLs
- [x] Separate login routes: `/company/login` and `/candidate/login` with tailored messaging
- [x] Auto-assign role from login URL context — remove `/choose-role` route
- [x] Handle wrong-URL login: redirect existing users to correct dashboard
- [x] SQLC queries for candidate profiles (create, get by user, update)
- [x] SQLC queries for extended company fields (update profile, get by slug)
- [x] Update seed data for new schema
- [x] Update existing tests for schema changes

### Sub-project 2: Public Browsing ✅

- [x] Public `/companies` route — company directory (card grid, search/filter by industry, size, tech stack)
- [x] Public `/companies/:slug` route — company profile page with open jobs listed
- [x] Public `/jobs` route — job board (card grid, search/filter by title, location, type, experience)
- [x] Public `/jobs/:id` route — job detail page (read-only, "Login to apply" CTA for unauthenticated)
- [x] Navigation: public header with Companies / Jobs tabs + login buttons
- [x] Authenticated candidates see "Apply" button instead of "Login to apply"
- [x] Update landing page nav to link to `/companies` and `/jobs`

### Prerequisite Refactors ✅

- [x] Refactor 1: URL search params — standardize search/filter state across public routes
- [x] Refactor 2: Fix skeletons — loading states match final layout for all public routes
- [x] Refactor 3: Rebrand hirely → roundzero — all references, cookies, seed prefixes, branding
- [x] Company profile page polish — hero meta, sidebar cleanup, avatar border removal
- [x] Seed data enrichment — tech_stack, social_links, founded_year, culture, work_history, links
- [x] Fix JSONB double-encoding bug — seed scripts used `JSON.stringify()` instead of `sql.json()` for tagged template inserts, causing JSONB columns to store strings instead of arrays/objects

### Sub-project 3: Onboarding Flows ✅

- [x] Company onboarding redesign — minimal fields (name, logo, industry, size, description), polished centered layout
- [x] Candidate onboarding — new flow: name (pre-filled), headline, resume upload
- [x] Company profile settings page — all fields editable, organized in sections
- [x] Candidate profile settings page — resume, headline, bio, skills, work history, links
- [x] Onboarding should not show dashboard sidebar — standalone centered layout
- [x] Explicit onboarding completion state via `onboarding_completed_at` for both candidates and companies
- [x] Dashboard/onboarding gating now checks onboarding completion state instead of live field presence

### Sub-project 4: Server-Side Pagination ✅

- [x] Schema cleanup — removed duplicate slug index on companies, case-insensitive email unique index on users, added `updated_at` to interviews
- [x] Converted raw `<button>` remove/dismiss icons to shadcn `Button` across onboarding forms
- [x] Added shadcn Pagination component
- [x] SQL queries: `getOpenJobsPaginated` + `countOpenJobsFiltered` (jobs), `getAllCompaniesPaginated` + `countCompaniesFiltered` (companies) — all with `sqlc.arg()` named params
- [x] Paginated server functions for jobs and companies (12 items/page, search + filter params, returns `{ items, total, totalPages }`)
- [x] Shared `PaginationNav` component — shadcn primitives with TanStack Router `Link`, preserves search params
- [x] `/jobs/` route — server-side filtering via `loaderDeps`, removed client-side `.filter()`, pagination UI
- [x] `/companies/` route — same pattern as jobs, filter changes reset to page 1
- [x] Trimmed `AGENTS.md`, added JSONB rule, verified zero `JSON.stringify`/`JSON.parse` in codebase

### Sub-project 5: Apply Flow Rework + Job Expiry ✅ / In Progress

- [x] One-click apply: single button, uses resume from candidate profile
- [x] Guard: require resume in profile before applying (prompt to complete profile if missing)
- [x] Remove per-application resume URL and links fields from apply form
- [x] Replace candidate-entered resume URLs with resume upload contract (`resume_key`, upload/finalize/read server functions)
- [x] Wire real Cloudflare R2 signed upload/read behavior behind the resume upload contract
- [x] Persist candidate `resume_key` immediately after upload so settings/onboarding refreshes read from the DB
- [x] Track `resume_updated_at` and show last-updated state in candidate settings
- [ ] `expires_at` field on job create/edit form (optional date picker)
- [ ] When creating a job posting, let companies enter questions and even set answers to those questions in a plain text box or in natural language. Also let them know our agent will pick it up and pass those when assessing a candidate. This will be an optional text box.
- [ ] Stale job indicator: badge on jobs older than 90 days with no expiry set
- [ ] Auto-close expired jobs: scheduled task or on-read check that sets `status = 'closed'` when `expires_at < now()`
- [ ] Update job browsing UI to hide expired/closed jobs by default

## Phase 3.5: Core Product Hardening Before AI ← NEXT

Finish the non-AI hiring platform so the interview/evaluation layer lands on a solid product foundation instead of filling workflow gaps. This phase focuses on closing the candidate/company experience gaps that still exist after jobs, onboarding, and one-click apply.

### Goals

- Complete the resume/storage flow end-to-end
- Finish job lifecycle behavior (expiry, stale roles, closed roles)
- Make apply work consistently from every candidate entry point
- Give companies a usable applicant-review workflow, not just a raw list
- Improve post-application clarity for both candidates and companies

### Sub-project 1: Resume Storage Completion ✅ / Final Cleanup

- [x] Add current-runtime Cloudflare R2 configuration (`.env` wiring, bucket CORS, signed URL credentials)
- [x] Replace mock upload behavior in candidate resume server functions with signed upload URL generation
- [x] Replace mock signed read behavior with short-lived signed download/view URLs
- [x] Validate allowed file types on server: PDF, DOC, DOCX
- [x] Enforce resume size limit on server before issuing upload target
- [x] Ensure uploaded resume keys are namespaced per user: `resumes/<userId>/<uuid>.<ext>`
- [x] Candidate onboarding: block profile completion until resume upload succeeds
- [x] Candidate settings: support replace-resume flow cleanly
- [x] Candidate settings: show meaningful current file state instead of generic “resume on file”
- [x] Candidate settings: show resume-specific last-updated timestamp
- [x] Company applicant views: wire “View resume” / “Download resume” to signed read URLs
- [x] Update seed data to use realistic `resume_key` values and onboarding/timestamp fields
- [ ] Update remaining legacy application/dashboard test fixtures to use realistic `resume_key` values instead of URL-shaped strings
- [ ] Add Worker/Wrangler-side R2 bindings when the runtime moves onto Cloudflare

### Sub-project 2: Company Logo Uploads ✅

- [x] Replace company logo URL input paths with direct upload
- [x] Add Cloudflare R2 signed upload/read flow for company logos
- [x] Canonical storage field is `logo_key` (no `logo_url` anywhere)
- [x] Company settings supports logo upload and replace-logo flow
- [x] Logos rendered from R2 public CDN URL across public and dashboard surfaces
- [x] Company onboarding logo upload intentionally omitted (logo added via settings)
- [x] Seed companies with real public-facing logo image URLs

### Sub-project 3: Job Lifecycle Hardening

- [ ] Add `expires_at` field to create/edit job UI
- [ ] Add optional date picker UX for expiry selection
- [ ] Show expiry date on company job detail and job management surfaces
- [ ] Show expiry/stale state on public and candidate job listings where relevant
- [ ] Add stale-job badge for roles older than 90 days with no expiry
- [ ] Hide expired/closed jobs by default in public browsing
- [ ] Ensure open-jobs queries consistently exclude expired jobs
- [ ] Add on-read or scheduled auto-close behavior for `expires_at < now()`
- [ ] Prevent applying to expired jobs with a user-facing message
- [ ] Add tests covering expired job visibility and application blocking

### Sub-project 4: Candidate Apply Surface Consistency

- [ ] Wire authenticated candidate apply from public `/jobs/:id` to the real apply mutation instead of a placeholder CTA
- [ ] Ensure unauthenticated public job detail still routes to candidate login correctly
- [ ] Ensure authenticated candidate public job detail reflects:
  - already applied state
  - missing resume state
  - just-applied success state
- [ ] Reuse the same apply-state UX across dashboard and public job detail
- [ ] Avoid duplicate logic paths for apply eligibility checks
- [ ] Add tests for public job detail apply behavior

### Sub-project 5: Candidate Application Experience

- [ ] Improve “My Applications” from basic table to clearer application tracking
- [ ] Add timeline-style metadata where useful: applied date, current status, last status change
- [ ] Show clearer status descriptions, not just enum labels
- [ ] Link candidates to relevant next actions when status changes
- [ ] Add empty states and guidance for first-time candidates
- [ ] Consider basic withdraw application flow
- [ ] Consider showing what profile snapshot was submitted at apply time
- [ ] Add tests for candidate application tracking views

### Sub-project 6: Company Applicant Review Workflow

- [ ] Add dedicated candidate/application detail route for company users
- [ ] Show structured applicant detail beyond the compact list on the job page
- [ ] Include:
  - resume access
  - submitted profile snapshot
  - application timestamps
  - current status
- [ ] Preserve role-based authorization for company ownership on all applicant detail views
- [ ] Add easier navigation between applicants for a job
- [ ] Improve applicant status controls and feedback states
- [ ] Add confirmation for destructive or terminal actions where appropriate
- [ ] Add tests for company applicant detail authorization and rendering

### Sub-project 7: Company Workflow Quality

- [ ] Improve job management list/detail UX for active vs draft vs closed roles
- [ ] Add more obvious pipeline summary cues beyond raw dashboard counts
- [ ] Make it clearer which jobs are attracting applicants and which are stale
- [ ] Ensure company settings and public profile are coherent and complete
- [ ] Consider company-side shortlist/review markers if the raw applicant list remains too shallow

### Sub-project 8: Product Communication + Notifications

- [ ] Add user-facing feedback for key actions:
  - application submitted
  - resume uploaded/replaced
  - job published/archived/closed
- [ ] Improve status language from internal enum wording to product wording
- [ ] Add durable in-app notifications as the primary notification system
- [ ] Add `notifications` table for persisted notification records
- [ ] Define notification event types for:
  - candidate application updates
  - company applicant activity
  - interview-ready and report-ready events later
- [ ] Add in-app notification read/unread state
- [ ] Add notification surface in the app shell/dashboard
- [ ] Use email as a secondary delivery channel, not the source of truth
- [ ] Add Resend-backed email sending for selected notification events
- [ ] Track email delivery attempt/result separately from in-app notification persistence
- [ ] Ensure no surface leaves the user unsure about the next step

### Exit Criteria Before AI

- [ ] Candidate can browse, upload a resume, apply from any valid surface, and clearly track applications
- [ ] Company can create/manage jobs, review applicants meaningfully, and access resumes reliably
- [ ] Expired/stale jobs behave correctly across queries and UI
- [x] Resume storage is real, not mocked
- [ ] Core hiring workflow feels complete without depending on the AI interview layer

### Recommended Execution Order

Build this phase in the following order to keep dependencies clean and avoid rework:

1. **Resume Storage Completion**
   - This is the main blocker for a credible hiring workflow.
   - Company-side applicant review is incomplete until resumes are actually accessible.

2. **Company Logo Uploads**
   - Company logo uploads now exist in settings only, with seeded public demo logos for browse surfaces.
   - Keep onboarding simpler and treat logo upload as a profile-quality improvement, not a setup blocker.

3. **Candidate Apply Surface Consistency**
   - Once resume storage works, make sure candidates can apply correctly from every valid surface.
   - Avoid shipping two different apply experiences with different rules.

4. **Job Lifecycle Hardening**
   - Expiry and stale-role behavior should be settled before polishing company/candidate workflows.
   - This affects queries, listings, detail pages, and application eligibility.

5. **Company Applicant Review Workflow**
   - After resumes and apply flows are stable, give companies a real applicant review surface.
   - This is the most important company-side gap before AI.

6. **Candidate Application Experience**
   - Improve post-apply tracking once the underlying application/job states are stable.
   - This prevents building timelines/status UX on top of shifting logic.

7. **Company Workflow Quality**
   - Add management polish after the core applicant-review flow exists.
   - This is useful, but lower priority than making the application funnel complete.

8. **Product Communication + Notifications**
   - Final pass for wording, durable in-app notifications, and secondary email delivery.
   - Best done after the main user flows and statuses are settled.

## Phase 4: AI Interview

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

## Phase 5: Evaluation & Reports

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

## Phase 6: Polish & Extras

- [ ] Candidate-facing interview status tracking
- [ ] Email notifications (interview ready, report available)
- [ ] Analytics (time-to-hire, funnel metrics)
- [ ] Company-specific evaluation tuning (weight adjustments)
- [ ] Full transcript view for companies (optional)
- [ ] Error handling and edge cases (expired interviews, failed evaluations)
- [ ] Loading states and optimistic UI
- [ ] Mobile responsiveness pass

## Phase 7 (Optional): Migrate to Better Auth

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

## Phase 8 (Optional): Web Interface Guidelines Compliance

Accessibility, animation, typography, and interaction polish based on a full-codebase audit against the [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines).

### Systemic (high priority — fix once, resolve everywhere)

- [ ] Add `@media (prefers-reduced-motion: reduce)` guard in `styles.css` for `animate-fade-in`, `animate-fade-in-up`, `animate-scale-in`, `animate-shimmer`
- [ ] Add `aria-hidden="true"` to all decorative `HugeiconsIcon` instances (~60+ occurrences) — consider a wrapper component
- [ ] Add skip link (`<a href="#main-content">Skip to main content</a>`) in `__root.tsx` and wrap page content in `<main id="main-content">`

### Accessibility (medium priority)

- [ ] Add `aria-label` to all icon-only buttons (back buttons, add/remove buttons, upload buttons across job-form, company-settings, candidate-settings)
- [ ] Add `aria-label` or `<label>` to filter `<Select>` and search `<Input>` on `/jobs/` and `/companies/` routes
- [ ] Add `name` and `autocomplete` attributes to all form inputs (fix in `app/shared/form.tsx` base components)
- [ ] Fix `pagination-nav.tsx` disabled links — add `tabIndex={-1}` alongside `aria-disabled` to prevent keyboard activation
- [ ] Add confirmation dialog for destructive status change (reject application) in `dashboard/jobs/$jobId.tsx`
- [ ] Convert footer/login "Terms" and "Privacy" `<span>` elements to `<a>`/`<Link>`
- [ ] Add visible `focus-visible:ring-*` to upload buttons (company onboarding, candidate onboarding)

### Animation & Performance (medium priority)

- [ ] Replace `transition-all` with explicit property lists (`transition-[border-color,box-shadow]`) on Card components, mode-toggle
- [ ] Replace hardcoded `"en-US"` locale with `Intl` defaults in `formatDate`/`formatSalary` (4 files)

### Typography & Copy (low priority)

- [ ] Replace all `...` with `…` (ellipsis character) in placeholders and loading labels (~30 instances)
- [ ] Add `text-wrap: balance` to all `<h1>`/`<h2>` headings
- [ ] Add `tabular-nums` to numeric columns (dashboard metrics, scores, dates)
- [ ] Replace straight apostrophes with curly (`\u2019`) in `not-found.tsx`
