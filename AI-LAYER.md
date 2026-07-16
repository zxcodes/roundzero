# RoundZero AI Layer (High-Level Reference)

## Core Principle

Do **not** run a full AI interview for every application.

That wastes compute, money, and candidate time.

Use a funnel:

```
Apply → Pre-Evaluation → Batch Pool → Interview (text + voice) → Post-Evaluation → Report → Batch Release → Company Review
```

---

# Overall Flow

1. Candidate applies to a job
2. System runs lightweight pre-evaluation **asynchronously** (`PreEvaluationWorkflow`)
3. If the candidate passes deterministic invite rules **and** report quota has slots:
   - application moves to `queued_for_batch` (pool — not an immediate invite)
4. When batch launch criteria are met, candidates receive interview invites (`interview_invited`)
5. If low fit or quota exhausted:
   - stay in `pre_screening` or receive `position_filled` notification
6. After text + voice complete, post-evaluation generates a report held at `evaluated_held`
7. When the batch releases, reports become visible and companies receive a `batch_ready` digest

**Not implemented:** a separate “medium fit → 2–3 clarifying questions” path. Pre-eval output is binary: pool for full interview or hold.

---

# Stage 1: Pre-Evaluation (Cheap + Fast)

## Goal

Decide whether a candidate deserves deeper evaluation.

## Inputs

- Resume text (extracted from PDF/DOCX in R2)
- Job title, description, requirements
- Job type classification (technical, customer_facing, creative, operations, leadership, general)

Screening questions are **not** inputs to pre-eval — they are used in the text interview system prompt.

## Pipeline (`PreEvaluationWorkflow`)

1. Fetch resume from R2, extract text
2. Classify job type → pick role-specific eval prompt
3. Resume authenticity / slop check
4. Role-specific structured pre-eval (`generateText` + `Output.object`)
5. Deterministic refine (`refinePreEvaluationResult`)
6. Persist `pre_evaluations`, decide hold vs `queued_for_batch`

## Output

- Fit score (0–10)
- Missing requirements
- Confidence (high / medium / low)
- Model next step (`interview_invited` | `hold`) — refined by deterministic policy

## Invite policy (`shouldInviteFromDeterministicRules`)

- Reject invite if `consistencyScore < 2` or `score < 5`
- Invite if model says `interview_invited`
- Or if `score >= 7.5` and consistency is null or `>= 7`

On workflow failure → application status `evaluation_failed` (recoverable via company re-invite).

---

# Stage 2: Batch Pool + Quota

## Quota math

Each job has an increase-only `final_report_target`, bounded by the current plan when it is created, published, or increased (Free 1, Starter 3, Growth 5, Scale 10). A later plan downgrade does not shrink an existing commitment.

```
delivered = distinct applications with a released report
reserved = distinct applications with an interview in pending | in_progress | awaiting_voice | completed and no released report
availableInviteSlots = max(0, final_report_target - delivered - reserved)
```

`queued_for_batch` is a waitlist and consumes no capacity. A completed interview remains reserved while its report is generated or held; releasing that report moves the same unit from reserved to delivered.

## Batch pooling (`queued_for_batch`)

Strong-fit candidates wait in a per-job pool. `checkAndLaunchBatch()` launches when:

- pool ≥ target size (min of `final_report_target` and `DEFAULT_TARGET_SIZE`), **or**
- pool ≥ `MIN_BATCH_SIZE` (3 prod / 1 dev-staging) after **12h** (`POOL_FORMATION_TIMEOUT_MS`), **or**
- pool ≥ 1 after **24h** (2× pool timeout)

Config: `app/features/batches/config.ts`. Pool also checked every **6h** via `PoolCheckWorkflow` cron.

## On batch launch

- Creates `job_batches` row, assigns interviews
- Sets `expiresAt` = now + **12 hours** (`INTERVIEW_EXPIRY_MS`)
- Sends `interview_invited` notification
- Starts `BatchOrchestrationWorkflow` (12h wait → release)

## Target reached

Stop creating new interviews. Remaining candidates stay in pipeline; `position_filled` notification sent. Not auto-rejected.

## Interview expiry + cancel

- Expiry applies only while `pending` or `in_progress` — **not** `awaiting_voice`
- Cancel → interview `cancelled`, application `withdrawn`
- Expire → interview `expired`, application returns to `pre_screening`
- A successful expiry, cancellation, withdrawal, or company rejection immediately checks the pool for a one-slot backfill after the state-changing transaction commits

---

# Agent Identity

The AI interviewer is named **Zero**.

Candidate-facing copy references Zero by name. This is product branding, not a model name.

---

# Text Interview Implementation

Hybrid architecture — **not** WebSockets for chat; **SSE** for turn streaming.

## Flow

1. **Start** — `startMyInterview` server function generates the first greeting (`chat()`, `stream: false`)
2. **Chat turns** — client posts to `POST /api/interview-chat` (SSE stream via TanStack AI `chat()`)
3. **Tools** — server-side tool loop (`maxIterations(5)`):
   - `check_resume_gap` — verify claims against resume/profile
   - `record_screening_coverage` — track requirement coverage
   - `end_interview` — submit for voice when coverage rules met
4. **Manual submit** — `completeMyInterview` also moves to `awaiting_voice`
5. **Post-eval blocked** until voice assessment completes

## System prompt

`buildInterviewSystemPrompt()` in `app/features/interviews/shared/runtime.ts` — job, candidate summary, pre-eval context, screening questions, coverage state, turn limits.

## Model selection

Source of truth: `app/shared/openrouter.ts` (`MODEL_CHAINS.interview`):

| Env     | Primary                                  | Fallback                                               |
| ------- | ---------------------------------------- | ------------------------------------------------------ |
| dev     | `meta-llama/llama-3.3-70b-instruct:free` | —                                                      |
| staging | `deepseek/deepseek-v4-flash`             | —                                                      |
| prod    | `anthropic/claude-sonnet-4.5`            | `anthropic/claude-haiku-4.5` → `google/gemini-2.5-pro` |

Fallbacks are OpenRouter `models` on the request (see `createChatModel` / `modelOptions.models`).

## Interview state

- `interviews` — status lifecycle (`pending`, `in_progress`, `awaiting_voice`, `completed`, `expired`, `cancelled`)
- `interview_messages` — full transcript
- `interviews.metadata` — `expiresAt`, `jobSnapshot`, `screeningCoverage`, `integrity` (pre-eval scores come from `pre_evaluations` at runtime)

---

# Stage 3: Deep Evaluation (Post-Eval)

Only for selected candidates who completed text + voice.

## `PostEvaluationWorkflow` (summary)

1. Idempotency check
2. Load interview context + transcript
3. `assess_answer_authenticity` (Haiku in prod)
4. `load_voice_assessment` — LLM analysis over stored ElevenLabs transcript (`generateText` + `Output.object`)
5. Generate structured report (`post_eval` chain)
6. Deterministic refine + `post_eval_audit` LLM pass
7. Blend voice into communication score
8. Persist report, move application to `evaluated_held`
9. Batch orchestration holds until release

## Voice assessment (ElevenLabs)

- ElevenLabs handles STT/LLM/TTS
- `getMyVoiceToken` fetches signed URL via ElevenLabs REST API (`fetch` to `api.elevenlabs.io`)
- Client: `@elevenlabs/client` + TanStack `useRealtimeChat` adapter
- On end: transcript persisted (`analysis: null` initially); interview → `completed`; `startPostEvaluation` triggered
- Voice dimension scoring runs in post-eval, not on the hot path

## Communication score blend

Dynamic weight in `applyVoiceAssessmentToReport()`:

```
voiceWeight = min(0.7, 0.15 + totalEvidence × 0.055)
communication = textScore × (1 - voiceWeight) + voiceOverall × voiceWeight
```

Not a fixed 60/40 split.

---

# Report Limits

`final_report_target` per job is enforced at the server and transaction boundaries. Capacity is consumed by delivered reports plus reserved report-producing interviews; waitlisted applications consume no capacity. Targets may increase within the current plan entitlement but never decrease.

---

# Application Status Lifecycle

**11 statuses** in `applicationStatusSchema` (`app/shared/enums.ts`):

`applied` → `pre_screening` → `queued_for_batch` → `interview_invited` → `interview_in_progress` → `evaluated_held` → `evaluated` → (`shortlisted` | `rejected`)

Also: `withdrawn`, `evaluation_failed`

**Rules:**

- System auto-advances through the funnel above
- Companies can **reject** at any pre-terminal stage (not read-only pre-eval)
- Only companies move `evaluated` → `shortlisted` | `rejected`
- Candidates can **withdraw** from most non-terminal states

---

# Candidate-Facing Messaging (implemented)

Copy lives in route components (e.g. `application/$applicationId.tsx` `stageCopy`), not a central label map.

Examples:

- `queued_for_batch` — “Under review” / invite typically within 12 hours
- `interview_invited` — Zero invited you to interview
- `position_filled` — quota reached, application still on file

---

# Company Experience

Evaluated candidates arrive with structured reports (summary, scores, strengths, weaknesses, insights, evidence, screening answers, answer authenticity risk, voice assessment, transcript).

Primary batched delivery: `batch_ready` digest email. Per-candidate `report_ready` for non-batched releases.

---

# Model Chains (all tasks)

Source: `app/shared/openrouter.ts`. Pre/post-eval and job creation use `DEFAULT_CHAIN`:

| Env     | Chain                                                                                  |
| ------- | -------------------------------------------------------------------------------------- |
| dev     | `openrouter/free`                                                                      |
| staging | `deepseek/deepseek-v4-flash`                                                           |
| prod    | `anthropic/claude-sonnet-4.5` → `anthropic/claude-haiku-4.5` → `google/gemini-2.5-pro` |

`post_eval_audit` prod: `google/gemini-2.5-pro` → `anthropic/claude-sonnet-4.5` — a
different model family than `post_eval` so the audit pass can catch model-specific biases.

`answer_authenticity` prod: `anthropic/claude-haiku-4.5` only.

Pre/post-eval use Vercel AI SDK `generateText` + Response Healing plugin.

---

# One-Line Summary

RoundZero deeply evaluates the right candidates, not every candidate — through selective pre-screening, batch-orchestrated interviews, and explainable multi-pass reports.
