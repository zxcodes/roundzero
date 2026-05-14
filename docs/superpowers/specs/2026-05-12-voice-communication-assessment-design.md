# Voice Communication Assessment

## Overview

A standalone real-time voice conversation that assesses a candidate's verbal communication skills. Separate from the text-based interview, it slots in as a post-interview supplement within the existing 12-hour interview window. The output — per-dimension scores with quoted transcript evidence + raw audio — feeds into the final report as a dedicated "Communication Assessment" section.

## Architecture

```
┌──────────────────────────────────────────────┐
│              InterviewAgent                   │
│  (AIChatAgent — text interview)               │
│  owns this.state including session + context  │
│  on completion sets                           │
│    state.voiceAssessmentStatus = "pending"    │
└───────────────────┬──────────────────────────┘
                    │
                    │ candidate clicks "Start voice assessment"
                    │
┌───────────────────▼──────────────────────────┐
│         VoiceAssessmentAgent                  │
│  (withVoice — real-time voice call)           │
│  separate DO, same interview context          │
│                                               │
│  Pipeline per turn:                           │
│    Mic → STT (WorkersAIFluxSTT)               │
│       → LLM (OpenRouter, streamText)          │
│       → TTS (WorkersAITTS)                    │
│       → Speaker                               │
│                                               │
│  on call end:                                 │
│    1. Save transcript to DB                   │
│    2. Run analysis (generateObject)           │
│    3. Save analysis + audio URL to DB         │
│    4. Signal post-eval workflow               │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│         PostEvaluation Workflow               │
│  waits for BOTH:                              │
│    - text interview completed                 │
│    - voice assessment completed               │
│  (or 12h expiry — proceeds without voice)     │
│  generates final report                       │
└──────────────────────────────────────────────┘
```

## Components

### 1. VoiceAssessmentAgent (Server, new DO)

New Durable Object class in `app/agents/voice-assessment.ts`. Uses `withVoice` from `@cloudflare/voice`.

#### Dependencies
- `@cloudflare/voice` — `withVoice`, `WorkersAIFluxSTT`, `WorkersAITTS`
- AI SDK — `streamText` for LLM responses via OpenRouter
- DB — `postgres` driver for reading context / saving results

#### Setup

```ts
import { Agent } from "agents";
import { withVoice, WorkersAIFluxSTT, WorkersAITTS } from "@cloudflare/voice";

const VoiceAgent = withVoice(Agent);

export class VoiceAssessmentAgent extends VoiceAgent<Env> {
  transcriber = new WorkersAIFluxSTT(this.env.AI);
  tts = new WorkersAITTS(this.env.AI);
  // ...
}
```

#### onTurn(transcript, context)

Called every time the candidate finishes speaking. Runs the LLM via `streamText` with an OpenRouter model and returns the streaming response for TTS.

- System prompt: communication assessment prompt (see below)
- Context: candidate profile, resume summary, job title, company, conversation history
- AbortSignal: from `context.signal` (handles interruptions)
- End call: when the agent determines it has enough signal, it returns a closing message with `##END_CALL##` appended. The `afterSynthesize(audio, text, connection)` pipeline hook detects this marker, strips it from the text before TTS, and calls `this.forceEndCall(connection)`

#### Pipeline hooks

The `afterSynthesize` hook detects when the LLM signals conversation end:

```ts
afterSynthesize(audio: ArrayBuffer, text: string, connection: Connection) {
  if (text.includes("##END_CALL##")) {
    this.forceEndCall(connection);
  }
  return audio; // pass through — audio already generated
}
```

#### onCallEnd(connection)

When the call ends (agent via `forceEndCall`, candidate hangs up, or connection drops):

1. Retrieve full transcript via `this.getConversationHistory()` (persisted in the DO's SQLite)
2. Run analysis via `generateObject` using the communication schema over the transcript
3. Save transcript + analysis to the `communication_assessments` table (via Postgres)
4. Store candidate audio key (sent by client via `sendJSON` on call end) in the same row
5. Signal the post-evaluation workflow via `instance.sendEvent` (see "Workflow Integration" below)

### Workflow Integration

The post-eval workflow uses CF Workflows' `waitForEvent` to pause until the voice assessment completes, with the 12-hour interview window as the timeout:

```
Workflow: postEvaluation
  1. Read application + interview data
  2. Process text interview transcript
  3. Wait for voice assessment event (max 12h remaining from interview window)
     → ctx.waitForEvent("voice_assessment_complete", { timeout: remainingMs })
  4. If event received: load voice data, include in report
  5. If timeout: proceed without voice data
  6. Generate and save final report
```

The voice agent signals back using CF Workflows' `instance.sendEvent`. The workflow instance ID is stored in the `interviews` table or interview state when the workflow is created:

```ts
// In VoiceAssessmentAgent, after analysis is saved:
const instance = await this.env.POST_EVALUATION.get(this.state.workflowInstanceId);
await instance.sendEvent({
  type: "voice_assessment_complete",
  payload: { assessmentId: savedAssessment.id },
});
```

### 2. Communication Schema (new file)

`app/prompts/communication-assessment.ts`

```ts
import { z } from "zod";

const dimension = z.object({
  score: z.number().min(0).max(100),
  evidence: z.array(z.string()),
});

export const communicationSchema = z.object({
  clarity: dimension,
  articulation: dimension,
  conciseness: dimension,
  listening: dimension,
  confidence: dimension,
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
}).strict();
```

### 3. Voice Assessment System Prompt (new file)

`app/prompts/voice-assessment.ts`

```
You are Zero, a communication assessor on RoundZero's hiring panel.
Have a natural voice conversation with the candidate.

Your goal is to assess their verbal communication skills —
NOT their technical knowledge or experience depth.

Behavior:
- Start with a warm opener referencing their background
- Ask about experiences they've actually had (from their profile)
- The goal is to get them talking naturally — follow-ups should probe
  for clarity, structure, and articulation, not technical depth
- Keep each turn under 30 seconds when speaking
- 3-5 minutes total conversation
- When you have enough signal, close warmly and end the call

Communication dimensions you're silently tracking:
- Clarity: Are their answers well-structured and easy to follow?
- Articulation: Do they express ideas precisely with appropriate vocabulary?
- Conciseness: Do they get to the point without rambling?
- Listening: Do they address what was asked or go off-topic?
- Confidence: Do they sound assured without being arrogant?

END THE CALL once you have enough signal across these dimensions.
Don't ask about everything — a few good responses are enough.

When ending the call, say a warm closing sentence then append ##END_CALL##.
```

### 4. Database: `communication_assessments` table

New migration:

```sql
CREATE TABLE communication_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id),
  application_id UUID NOT NULL REFERENCES applications(id),
  audio_key TEXT,                       -- R2 key for raw audio
  transcript JSONB NOT NULL,            -- [{ role, text, timestamp }]
  analysis JSONB NOT NULL,              -- { clarity, articulation, conciseness, listening, confidence, overallScore, summary }
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comm_assessments_interview ON communication_assessments(interview_id);
CREATE INDEX idx_comm_assessments_application ON communication_assessments(application_id);
```

### 5. Candidate UI (new route)

New page at `/interviews/<id>/voice-assessment` within the existing interview module.

**States:**
- **Pending**: "Your communication assessment is ready. ~5 min voice call." → "Start" button
- **Connecting**: Establishing WebSocket to VoiceAssessmentAgent
- **In call**: Mic visualization (audio level bar), live transcript, "End call" button
- **Processing**: "Analyzing your responses..."
- **Complete**: "Assessment complete! Results will appear in your report."

**Key behaviors:**
- Browser permission prompt for microphone access
- Mobile-responsive (candidates likely on phone)
- Graceful handling of: mic denial, connection drop, browser close (auto-ends call)
- `useVoiceAgent` hook from `@cloudflare/voice/react`

### 6. Report Integration (Post-evaluation)

The report schema already has a `scores.communication` field. The voice assessment analysis feeds into this score as a weighted input and adds a new `communicationAssessment` section:

```ts
communicationAssessment: {
  clarity: { score: number, evidence: string[] },
  articulation: { score: number, evidence: string[] },
  conciseness: { score: number, evidence: string[] },
  listening: { score: number, evidence: string[] },
  confidence: { score: number, evidence: string[] },
  overallScore: number,
  summary: string,
  transcriptUrl: string,  // link to download transcript
}
```

The post-eval workflow:
1. Checks if a `communication_assessment` exists for this interview
2. If yes: includes full voice analysis + adjusts `scores.communication` (weighted: 60% voice, 40% text)
3. If no (expiry): proceeds without it, notes "Communication assessment was not completed within the interview window"

### 7. Wrangler Configuration

Add to the existing DO bindings and migrations:

```jsonc
{
  "durable_objects": {
    "bindings": [
      // ... existing
      {
        "name": "VoiceAssessmentAgent",
        "class_name": "VoiceAssessmentAgent"
      }
    ]
  },
  "migrations": [
    // ... existing
    {
      "tag": "v2",
      "new_sqlite_classes": ["VoiceAssessmentAgent"]
    }
  ]
}
```

## Edge Cases & Error Handling

| Case | Behavior |
|------|----------|
| Candidate denies mic permission | Show browser-native retry prompt. After 2 denials, mark as "skipped" and proceed without voice assessment |
| WebSocket drops mid-call | Show reconnecting state. Auto-retry 3 times. After failure, save partial transcript and proceed |
| Agent fails to generate response | `onTurn` returns a fallback "Could you repeat that?" — same model error pattern as text interview |
| Analysis (generateObject) fails | Retry once. If still fails, proceed with heuristic scores based on transcript length/word count |
| Candidate never starts voice assessment | 12h expiry triggers post-eval without voice data |
| Candidate hangs up mid-call | Save whatever transcript exists, run analysis on partial data, note "Call ended early" |

## Implementation Order

1. Create `communication_assessments` DB migration
2. Create SQLC queries for the new table
3. Build `VoiceAssessmentAgent` (`app/agents/voice-assessment.ts`)
4. Create voice assessment prompt (`app/prompts/voice-assessment.ts`)
5. Create communication schema (`app/prompts/communication-assessment.ts`)
6. Build candidate UI (`app/features/interviews/routes/voice-assessment.tsx`)
7. Wire up post-eval to read voice data and update report schema
8. Add `signalPostEvalStep` from voice agent to post-eval workflow
9. Add Wrangler DO binding + migration
10. Integration test: full flow with mock mic input
