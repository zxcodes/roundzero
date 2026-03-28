# Hirely – Architecture

## Stack

| Layer           | Technology                                                                     |
| --------------- | ------------------------------------------------------------------------------ |
| Framework       | TanStack Start (React 19, Vite 7)                                              |
| Server / Deploy | Cloudflare Workers + Wrangler                                                  |
| Database        | Postgres (Neon for prod, Docker for local)                                     |
| Typed queries   | SQLC                                                                           |
| Migrations      | dbmate                                                                         |
| AI agents       | Cloudflare Agents SDK (Durable Objects)                                        |
| AI models       | Vercel AI SDK (`ai` package) with any provider (OpenAI, Anthropic, Workers AI) |
| Auth            | Google OAuth (server-side sessions via cookies)                                |
| UI              | shadcn/ui, Tailwind CSS v4, Phosphor Icons                                     |
| Linting         | Biome                                                                          |

---

## Deployment

Single Cloudflare deployment. TanStack Start runs on Workers via `@cloudflare/vite-plugin`. Agent Durable Objects are deployed alongside the main app in the same worker.

```
wrangler.jsonc
├── main: TanStack Start SSR entry
├── durable_objects:
│   ├── InterviewAgent (AIChatAgent – per-interview session)
│   └── EvaluationAgent (Agent – scoring/report generation)
├── ai: { binding: "AI" }
└── compatibility_flags: ["nodejs_compat"]
```

---

## Directory Structure

```
app/
├── routes/                        # TanStack file-based routes
│   ├── __root.tsx
│   ├── index.tsx                  # Landing page
│   ├── login.tsx
│   ├── dashboard.tsx              # Company dashboard (layout)
│   ├── dashboard.jobs.tsx
│   ├── dashboard.jobs.$jobId.tsx
│   ├── dashboard.candidates.$candidateId.tsx
│   ├── jobs.tsx                   # Public job listing (candidates)
│   ├── jobs.$jobId.tsx            # Job detail + apply
│   ├── interview.$interviewId.tsx # Chat-based interview UI
│   └── report.$reportId.tsx       # Candidate report view
│
├── features/
│   ├── auth/
│   │   ├── server-fns.ts          # Google OAuth login/logout/session
│   │   ├── provider.tsx           # Auth context
│   │   ├── queries/               # SQLC: users table
│   │   └── services/
│   │       └── session.ts
│   │
│   ├── jobs/
│   │   ├── server-fns.ts          # CRUD for jobs
│   │   ├── components/
│   │   │   ├── job-form.tsx
│   │   │   ├── job-card.tsx
│   │   │   └── job-list.tsx
│   │   ├── queries/               # SQLC: jobs table
│   │   └── services/
│   │       └── job.ts
│   │
│   ├── applications/
│   │   ├── server-fns.ts          # Apply, upload resume, status
│   │   ├── components/
│   │   │   ├── apply-form.tsx
│   │   │   └── application-list.tsx
│   │   ├── queries/               # SQLC: applications table
│   │   └── services/
│   │       └── application.ts
│   │
│   ├── interviews/
│   │   ├── server-fns.ts          # Create/fetch interview sessions
│   │   ├── components/
│   │   │   ├── interview-chat.tsx  # Main chat UI (useAgentChat)
│   │   │   └── interview-status.tsx
│   │   ├── queries/               # SQLC: interviews table
│   │   └── services/
│   │       └── interview.ts
│   │
│   ├── reports/
│   │   ├── server-fns.ts          # Fetch/list candidate reports
│   │   ├── components/
│   │   │   ├── report-card.tsx
│   │   │   ├── report-detail.tsx
│   │   │   └── score-breakdown.tsx
│   │   ├── queries/               # SQLC: reports table
│   │   └── services/
│   │       └── report.ts
│   │
│   └── ranking/
│       ├── server-fns.ts          # Ranked candidate list per job
│       ├── components/
│       │   └── ranked-list.tsx
│       └── queries/               # SQLC: ranking views/queries
│
├── agents/                         # Cloudflare Agents (Durable Objects)
│   ├── interview-agent.ts          # AIChatAgent – conducts interviews
│   └── evaluation-agent.ts         # Agent – runs evaluation pipeline
│
├── shared/
│   ├── auth/
│   │   └── session.ts              # Cookie session helpers
│   ├── server/
│   │   └── request-middleware.ts    # Shared server fn middleware
│   └── db.ts                       # Postgres client
│
├── components/                     # Global UI
│   ├── theme-provider.tsx
│   ├── mode-toggle.tsx
│   └── ui/                         # shadcn components
│
├── lib/
│   ├── utils.ts                    # cn() etc
│   └── theme.ts                    # Theme server fns
│
├── router.tsx
├── routeTree.gen.ts
└── styles.css

db/
├── migrations/
│   └── 00000000000000_init.sql     # Single init migration
├── schema.sql                      # Full schema (human-readable)
└── init.sql                        # Same as migration (SQLC reference)
```

---

## Database Schema (Conceptual)

```sql
-- Users (both company admins and candidates)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  picture       TEXT,
  role          TEXT NOT NULL CHECK (role IN ('company', 'candidate')),
  google_id     TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Companies
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Jobs
CREATE TABLE jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  requirements  JSONB NOT NULL DEFAULT '[]',   -- structured skills/requirements
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Applications
CREATE TABLE applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES jobs(id),
  candidate_id  UUID NOT NULL REFERENCES users(id),
  resume_url    TEXT,
  links         JSONB DEFAULT '[]',           -- github, portfolio, etc
  status        TEXT NOT NULL DEFAULT 'applied'
                CHECK (status IN ('applied', 'interviewing', 'evaluated', 'rejected')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, candidate_id)
);

-- Interviews (each maps to a Durable Object instance)
CREATE TABLE interviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id),
  agent_id      TEXT NOT NULL,                 -- Durable Object ID (for reconnect)
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Reports (final output of the evaluation pipeline)
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id  UUID NOT NULL REFERENCES interviews(id) UNIQUE,
  application_id UUID NOT NULL REFERENCES applications(id),
  summary       TEXT NOT NULL,                  -- 2-3 sentence overview
  strengths     JSONB NOT NULL DEFAULT '[]',    -- evidence-backed bullet points
  weaknesses    JSONB NOT NULL DEFAULT '[]',
  insights      JSONB NOT NULL DEFAULT '[]',    -- key behavioral/technical insights
  evidence      JSONB NOT NULL DEFAULT '[]',    -- selected answers + reasoning
  scores        JSONB NOT NULL,                 -- { technical, communication, experience, overall }
  recommendation TEXT NOT NULL
                CHECK (recommendation IN ('strong_hire', 'consider', 'not_recommended')),
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

## Agent Architecture

### Overview

Two specialized agents, both running as Cloudflare Durable Objects:

```
Candidate applies
       │
       ▼
┌─────────────────┐
│ InterviewAgent   │  ← AIChatAgent (Durable Object)
│                  │  ← One per interview session
│ - Resume analysis│  ← WebSocket chat with candidate
│ - Adaptive Q&A   │  ← Tool calls for probing logic
│ - Conversation   │  ← Messages auto-persisted to DO SQLite
│   persistence    │
└────────┬────────┘
         │ interview completed
         ▼
┌─────────────────┐
│ EvaluationAgent  │  ← Agent (Durable Object)
│                  │  ← Triggered when interview completes
│ - Skill scoring  │  ← Reads full transcript from InterviewAgent
│ - Communication  │  ← Multi-pass evaluation (specialized prompts)
│   scoring        │  ← Writes final report to Postgres
│ - Consistency    │
│   checking       │
│ - Report gen     │
└─────────────────┘
```

### InterviewAgent (AIChatAgent)

Extends `AIChatAgent` from `@cloudflare/ai-chat`. One instance per interview session.

**Responsibilities:**

- Conduct the async chat interview with the candidate
- Analyze uploaded resume (passed as context on session creation)
- Adapt questions based on responses (LLM-driven branching)
- Detect inconsistencies and probe deeper
- Track interview progress and enforce time/question limits

**Key features used:**

- `onChatMessage()` — handles each candidate message, streams AI response
- Automatic message persistence to DO SQLite — survives disconnects
- `useAgentChat` React hook — client-side chat UI
- Server-side tools for structured evaluation during the conversation
- Resumable streams — candidate can close tab and come back

**System prompt structure:**

```
You are an interviewer for [job title] at [company name].
Role requirements: [structured requirements from job posting]
Candidate resume: [extracted resume data]
Interview stage: [initial | probing | scenario | wrapping_up]

Conduct a structured, adaptive interview. Your goals:
1. Validate claims from the resume
2. Assess technical depth for required skills
3. Evaluate communication clarity
4. Present real-world scenarios relevant to the role
5. Flag any inconsistencies

Ask one question at a time. Probe deeper on weak or vague answers.
Do not ask more than 15 questions total.
```

**Tools available to the agent:**

- `updateStage` — transitions interview stage (initial → probing → scenario → wrap-up)
- `flagInconsistency` — records a contradiction for the evaluation phase
- `completeInterview` — marks interview done, triggers evaluation

### EvaluationAgent (Agent)

Extends base `Agent`. Triggered when an interview completes.

**Responsibilities:**

- Read the full interview transcript
- Run multi-pass evaluation with specialized prompts:
  - **Technical assessment** — depth of knowledge, correctness, reasoning
  - **Communication assessment** — clarity, structure, articulation
  - **Experience validation** — ownership vs. contribution, verified claims
  - **Consistency check** — contradictions, resume-vs-interview mismatches
- Aggregate scores with configurable weights
- Generate the final candidate report
- Write report to Postgres

**Why a separate agent (not a server function):**

- Evaluation is multi-step and can take 30-60 seconds
- Multiple LLM calls in sequence (one per evaluator dimension)
- Durable Object guarantees completion even if the original request times out
- Built-in scheduling allows retry on failure

---

## System Flow

```
1. Company posts job
   └── POST /api/jobs → jobs table (status: open)

2. Candidate applies
   └── POST /api/applications → applications table
   └── Upload resume → R2/S3 storage
   └── Create interview row → interviews table (status: pending)

3. Candidate starts interview
   └── GET /interview/:interviewId
   └── Connect to InterviewAgent via WebSocket (useAgentChat)
   └── InterviewAgent created as Durable Object (ID = interview.agent_id)
   └── System prompt injected with job requirements + resume data
   └── interviews.status → 'in_progress'

4. Interview conversation
   └── Candidate sends messages via WebSocket
   └── InterviewAgent streams responses (adaptive questioning)
   └── All messages auto-persisted in DO SQLite
   └── ~15 questions, ~20-40 minutes
   └── InterviewAgent calls completeInterview tool when done

5. Evaluation
   └── InterviewAgent triggers EvaluationAgent
   └── EvaluationAgent reads full transcript
   └── Runs 4 evaluation passes (technical, communication, experience, consistency)
   └── Aggregates scores, generates report
   └── Writes report to Postgres → reports table
   └── interviews.status → 'completed'
   └── applications.status → 'evaluated'

6. Company reviews
   └── Dashboard shows ranked candidates per job
   └── Each candidate has: report, scores, recommendation
   └── Company can view full transcript (optional)
   └── Company decides who to bring to next round
```

---

## AI Model Strategy

Use the Vercel AI SDK (`ai` package) for model abstraction. This works with any provider:

```ts
// Can swap providers without changing agent logic
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createWorkersAI } from "workers-ai-provider";

// Interview agent — needs fast streaming, good at conversation
const interviewModel = openai("gpt-4o-mini");

// Evaluation agent — needs strong reasoning, ok with higher latency
const evaluationModel = anthropic("claude-sonnet-4-20250514");
```

Workers AI can be used as a fallback or for cost-sensitive operations. The `ai` package's `streamText` and `generateObject` work identically regardless of provider.

---

## Auth Flow

1. Google OAuth via `@react-oauth/google` on the client
2. Server function receives access token, fetches Google user info
3. Upsert user in Postgres
4. Set session cookie (encrypted, httpOnly)
5. Role selection on first login (company or candidate)
6. Server functions read session from cookie via middleware

---

## File Storage

Resumes and attachments stored in Cloudflare R2 (S3-compatible):

```
wrangler.jsonc:
  r2_buckets: [{ binding: "BUCKET", bucket_name: "hirely-uploads" }]
```

Upload flow:

1. Server function generates presigned upload URL
2. Client uploads directly to R2
3. URL stored in `applications.resume_url`

---

## MVP Scope

### Phase 1: Foundation

- [ ] Auth (Google OAuth, sessions, role selection)
- [ ] Company: create company, post jobs
- [ ] Candidate: browse jobs, apply with resume

### Phase 2: AI Interview

- [ ] InterviewAgent (AIChatAgent with adaptive questioning)
- [ ] Interview chat UI (useAgentChat)
- [ ] Resume extraction and context injection

### Phase 3: Evaluation & Reports

- [ ] EvaluationAgent (multi-pass scoring)
- [ ] Report generation and storage
- [ ] Company dashboard with ranked candidates
- [ ] Report detail view

### Phase 4: Polish

- [ ] Candidate interview status tracking
- [ ] Email notifications (interview ready, report available)
- [ ] Analytics (time-to-hire, funnel metrics)
- [ ] Company-specific evaluation tuning

---

## Key Decisions

| Decision                  | Choice                            | Rationale                                                      |
| ------------------------- | --------------------------------- | -------------------------------------------------------------- |
| Interview mode            | Async chat (not email, not video) | Better UX, real-time context, easier orchestration             |
| Agent runtime             | CF Durable Objects                | Built-in state, WebSocket, scheduling, survives disconnects    |
| Separate evaluation agent | Yes                               | Decouples interview from scoring, allows async multi-pass eval |
| Model abstraction         | Vercel AI SDK                     | Provider-agnostic, same API for OpenAI/Anthropic/Workers AI    |
| Resume storage            | Cloudflare R2                     | Same platform, S3-compatible, no egress fees                   |
| Session storage           | Cookies (not DB sessions)         | Simpler, stateless server, works with edge runtime             |
