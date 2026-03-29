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
