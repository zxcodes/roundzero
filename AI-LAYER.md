# RoundZero AI Layer (High-Level Reference)

## Core Principle

Do **not** run a full AI interview for every application.

That wastes:
- compute
- money
- candidate time

Use a funnel:

Application → Pre-Evaluation → Selective Deep Evaluation → Report → Company Review

---

# Overall Flow

1. Candidate applies to a job
2. System runs lightweight pre-evaluation **asynchronously**
3. If candidate looks promising **and job report quota is available**:
   - invite to RoundZero interview
4. If medium fit **and job report quota is available**:
   - ask 2–3 clarifying questions first
5. If low fit:
   - keep under review (no interview)
6. If job report quota is exhausted:
   - remaining pending candidates stay in pipeline
   - candidates receive "position filled" notification
   - no new interviews are created
7. Company receives evaluated candidates with reports

---

# Stage 1: Pre-Evaluation (Cheap + Fast)

## Goal

Decide whether a candidate deserves deeper evaluation.

## Inputs

- Resume
- Candidate profile
- Job description
- Required skills
- Company custom questions

## Output

- Fit score
- Missing requirements
- Confidence
- Next step

## Example Output

- Score: 78
- Missing: AWS experience
- Confidence: High
- Next Step: Invite to RoundZero

## What It Should Check

- Relevant skills match
- Relevant experience
- Seniority fit
- Basic job alignment

---

# Stage 2: Decision Layer

## Quota Check First

Each job has a `final_report_target` set at create/edit time. The default equals the company's plan `reports/job` limit and is clamped to `1..perJobLimit` (Free: 1, Starter: 3, Growth: 5, Scale: 10). The system delivers that many final reports when enough eligible candidates exist.

Capacity is computed from completed reports and active interviews:
- `remainingReports = final_report_target - completedReports`
- `availableInviteSlots = remainingReports - activeInterviews(status IN pending|in_progress)`

## High Match

→ Invite to full AI interview (if quota available)

## Medium Match

→ Ask 2–3 clarifying questions first (if quota available)

## Low Match

→ Hold in `pre_screening` (no interview)

## Target Reached

→ Stop creating interviews. Remaining pending candidates stay in pipeline and receive a "position filled" notification. They are NOT auto-rejected.

## Interview Expiry + Cancel

- Interview invites expire after 48 hours
- Candidates can cancel interviews if they no longer want to participate
- Expired or cancelled interview slots are recycled to the next best eligible candidate

---

# Agent Identity

The AI interviewer is named **Zero**.

Candidate-facing copy references Zero by name:
- "Zero invited you to complete an interview for this role."
- "Your interview with Zero is in progress."
- "Zero has completed the evaluation."

This is a product branding decision, not a model name. The underlying agent class can change; Zero is the user-facing identity.

---

# Text Interview Implementation

The text interview uses **TanStack AI** (`@tanstack/ai`) with **OpenRouter** (`@tanstack/ai-openrouter`) via server functions — no WebSockets, no streaming, no persistent agent runtime.

## Flow

1. Candidate clicks "Start" → `startMyInterview` server function prepares context and generates the first greeting via `chat()` from `@tanstack/ai`
2. Candidate types a message → client calls a server function that appends the message to `interview_messages`
3. Server calls OpenRouter via `chat()` with full message history + system prompt → appends response to `interview_messages`
4. The LLM drives the conversation — it decides when the interview is complete and responds accordingly
5. Candidate or system marks interview complete → `completeMyInterview` triggers the post-evaluation workflow

## System Prompt

Built by `buildInterviewSystemPrompt()` in `app/features/interviews/shared/runtime.ts`. Injected with:

- Job description, requirements, custom questions
- Candidate summary (resume text, profile)
- Pre-evaluation results (score, missing requirements, authenticity flags)
- Screening coverage state (which requirements have been addressed)
- Turn count and max questions

## Model Selection

Uses the `"interview"` chain from `app/shared/openrouter.ts`. Currently:
- Dev: `meta-llama/llama-3.3-70b-instruct:free` / fallback `google/gemini-2.5-flash`
- Staging: `google/gemini-2.5-flash` / fallback `anthropic/claude-haiku-4.5`
- Prod: `anthropic/claude-haiku-4.5` / fallback `anthropic/claude-sonnet-4.5`

No agent-side tool calls. The LLM receives all context in the system prompt and generates plain-text responses. Evaluation is performed post-hoc by the post-evaluation workflow.

## Interview State

State is stored in the database:
- `interviews` table — status lifecycle (`pending`, `in_progress`, `completed`, `expired`, `cancelled`)
- `interview_messages` table — full transcript per interview
- `interviews.metadata` — JSONB with expiry timestamp, pre-evaluation score, context state, screening coverage

---

# Stage 3: Deep Evaluation

Only for selected candidates.

## Goal

Measure actual hiring signal beyond resume.

## What Happens

- Resume clarification
- Role-specific questions
- Problem solving
- Tradeoff / judgment questions
- Dynamic follow-ups

## Output

Structured candidate report

---

# Report Limits

Companies set `final_report_target` during job creation. The default and maximum come from the subscription plan (`PLAN_CONFIGS.includedReportsPerJob`). Server enforcement via `enforceReportTarget()` ensures the value stays within `1..perJobLimit`.

Why a limit:
- Prevents noise for companies with only 1 opening
- Keeps evaluation costs predictable
- Forces selectivity in the funnel

When the target is reached, the pipeline closes for new evaluations but the job may remain open. Companies still see unevaluated applicants in a pending list and can manually review or reject them.

---

# Candidate Experience

## After Apply

### Strong Fit
"Zero invited you to complete an interview for this role."

### Medium Fit
"Zero has a few additional questions to help evaluate your fit."

### Low Fit
"Application received and under review."

### Position Filled (Quota Reached)
"This position has received enough evaluations. Your application is still on file and the company may review it directly."

---

# Company Experience

Instead of raw applicants, companies see evaluated candidates.

## Candidate Card

- Name
- Score
- Strengths
- Concerns
- Status

## Full Report

- Overall score
- Summary
- Technical reasoning
- Communication
- Experience relevance
- Strengths
- Risks
- Resume
- Transcript (optional)

---

# Application Status Lifecycle (Decided)

> See **PLATFORM.md § 16.1** for the full decision.

**Decided:** Extend `applications.status` to include all 8 statuses in a single enum.

**Status Funnel:**
- `applied` → `pre_screening` → (`interview_invited` | other outcome) → `interview_in_progress` → `evaluated` → (`shortlisted` | `rejected`)

**Transition Rules:**
- Only companies can move `evaluated` → `shortlisted` or `rejected`
- System auto-advances through `pre_screening` → `interview_invited` → `interview_in_progress` → `evaluated`
- Companies can manually reject at any pre-evaluation stage
- When `final_report_target` is reached, system stops advancing new candidates out of `pre_screening`

---

# Important Notes

## Pre-Evaluation should NOT decide final hiring

It only decides:

"Who deserves deeper evaluation?"

## Avoid keyword-only matching

Use semantic/contextual matching.

## Voice Assessment

A voice communication assessment runs after the text interview using **ElevenLabs Conversational AI**.

### Architecture

- ElevenLabs handles all voice processing (STT, LLM, TTS) as a managed service
- `getMyVoiceToken` server function generates a signed URL via `@elevenlabs/elevenlabs-js`
- Client connects via `@elevenlabs/client` `Conversation.startSession({ signedUrl, dynamicVariables })`
- Agent system prompt and voice personality are configured in the ElevenLabs dashboard
- Candidate/job context injected via `dynamicVariables` (`candidate_name`, `job_title`, `company_name`, `candidate_summary`)
- Transcript analysis runs server-side via OpenRouter `generateObject` when the call ends

### Flow

1. After text interview completes, candidate enters the voice tab in the interview UI
2. Client calls `getMyVoiceToken` to get a signed ElevenLabs session URL
3. `@elevenlabs/client` connects via WebSocket — voice conversation begins immediately
4. Candidate speaks, agent responds — all audio/LLM handled by ElevenLabs
5. On end (candidate clicks End Call or agent calls `end_call` tool):
   - Transcript is fetched from ElevenLabs API
   - `generateObject` runs structured analysis against `communicationAssessmentSchema`
   - Results saved to `communication_assessments`
   - Post-evaluation workflow receives `voice_assessment_complete` event

### Report Integration

- Voice analysis rendered in the company report as a timeline node under "Voice Communication Assessment"
- 5 dimension scores: clarity, articulation, conciseness, listening, confidence
- Score blended into `communication` dimension (60% voice, 40% text)
- Evidence quotes deduplicated into a "Key moments" section

### DB Table

- `communication_assessments` — one row per interview
- Stores `status`, `transcript` (JSONB), `analysis` (JSONB — per-dimension scores + evidence), `audio_key`

---

## Keep Simple

Build:
- pre-screening
- selective AI interviews
- candidate reports
- **voice communication assessment**

Skip for now:
- video interviews
- multiple visible agents (the ElevenLabs voice agent IS the agent — no custom agent code)
- advanced analytics
- over-engineered systems

---

# Long-Term Opportunity

Reusable candidate profile:

If a candidate completed RoundZero recently:
- reuse previous evaluation
- ask only role-specific delta questions

This reduces cost and improves UX.

---

# Product Decisions (Phase 3.5 Exit Criteria)

> All product decisions are documented in **PLATFORM.md § 16**. Refer there for full context.

## Decided Decisions

| # | Decision | Status |
|---|----------|--------|
| 1 | Application Status Lifecycle | ✅ Extend single `applications.status` enum to all 8 statuses |
| 2 | Candidate-Facing Messaging | ✅ Hide pre-evaluation stages; show only 6 candidate-visible statuses |
| 3 | Medium-Fit Follow-Up | ✅ Use synchronous chat UI (same as full interview) with 2–3 questions |
| 4 | Company View Pre/Post AI | ✅ Show full pipeline; pre-eval candidates are read-only, post-eval show real scores |
| 5 | Pre-Evaluation Output Format | ✅ Pipeline live; real-world validation with hiring managers deferred to post-MVP |
| 6 | Final Report Target | ✅ `final_report_target` per job (plan-based default/max). Target reached → stop new evaluations, notify candidates, no auto-reject. |

---

# One-Line Summary

RoundZero deeply evaluates the right candidates, not every candidate.
