# RoundZero — Build Plan

> Tech stack, schema, auth, storage, and module layout are documented in `ARCHITECTURE.md`.

## Phase 3.5: Pre-AI Hardening

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

AI-LAYER introduces new statuses: `pre_screening`, `invited_roundzero`, `in_roundzero`, `evaluated`, `shortlisted`. Current `applications.status` uses `applied`, `reviewing`, `shortlisted`, `rejected`.

- [x] Extend existing `applications.status` enum to include all 7 statuses
- [x] Define transition rules and who can trigger each
- [x] Document decided lifecycle in `PLATFORM.md` (§ 15.1)

#### Decision 2: Candidate-Facing Messaging After Apply

Post-apply becomes multi-step after AI. Define exact copy and expectations for each branch.

- [x] Write candidate-facing copy for each internal status
- [x] Hide pre-evaluation stages; show only 6 candidate-visible statuses
- [x] Define candidate messages for strong / medium / low fit tiers
- [x] Document decided messaging spec in `PLATFORM.md` (§ 15.2)

#### Decision 3: Medium-Fit Follow-Up Medium

AI-LAYER specifies "2-3 clarifying questions" for medium-fit candidates. This drives data model and UI.

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

The riskiest assumption: that pre-evaluation output (score + missing requirements + confidence + next step) is good enough for companies to trust.

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

## Phase 7 (Optional): Better Auth Migration

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

## Phase 8 (Optional): Web Interface Guidelines Compliance

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

## Phase 9 (Post-Release): Landing Page Enhancements

- [ ] Add social proof section (logos, testimonials, or metrics once available)
- [ ] Add candidate-side value prop (brief section addressing job seekers)
- [ ] Add comparison section (traditional screening vs RoundZero side-by-side)