# Cloudflare Voice Assessment Migration Plan

**Date:** 2026-08-09  
**Status:** Approved and independently reviewed, ready for implementation  
**Migration strategy:** Replace ElevenLabs outright on the migration branch; no provider flag and no dual runtime  
**Target:** Deploy to staging immediately, validate there, then merge the same Cloudflare-only implementation to production  
**Rollback:** Deploy a prepared ElevenLabs compatibility artifact that retains the already-applied Cloudflare Durable Object migration/binding

---

## 1. Goal

Replace the current ElevenLabs Conversational AI voice assessment with Cloudflare's Beta Voice Agents stack while preserving RoundZero's existing product contract:

1. The candidate finishes the text interview and enters `awaiting_voice`.
2. The candidate starts a short browser-based voice assessment with Zero.
3. The transcript is durably finalized in Postgres.
4. `communication_assessments` and `interviews` transition to `completed` atomically.
5. The existing post-evaluation Workflow starts exactly once and produces the same communication scoring/report output.

The target runtime is:

```diagram
┌──────────────────────┐
│ Candidate browser    │
│ @cloudflare/voice    │
│ useVoiceAgent()      │
└──────────┬───────────┘
           │ authenticated same-origin WebSocket
           │ /agents/voice-assessment-agent/{interviewId}
           │ Secure HttpOnly capability cookie
           ▼
┌──────────────────────────────────────────────────────────┐
│ VoiceAssessmentAgent Durable Object                      │
│ one SQLite-backed instance per interview                 │
│                                                          │
│ Flux STT ─▶ Workers AI LLM ─▶ Aura TTS                  │
│             source-controlled prompt                     │
│                                                          │
│ SQLite conversation history + lifecycle hooks            │
└──────────┬───────────────────────────────────────────────┘
           │ normalized [{ role: assistant|candidate, content }]
           ▼
┌──────────────────────────────────────────────────────────┐
│ Existing Postgres finalization                           │
│ finalizeVoiceAssessmentFromTranscript()                  │
│   ├─ complete communication assessment                   │
│   ├─ complete interview                                  │
│   └─ startPostEvaluation()                               │
└──────────────────────────────────────────────────────────┘
```

Cloudflare is the only voice provider in the resulting code. Production continues to use ElevenLabs only because production remains deployed at the old commit until cutover.

---

## 2. Why this migration is being done now

The current ElevenLabs subscription has a recurring fixed cost even when RoundZero has no active users. Rolled-over credits preserve nominal value but do not solve the cash-flow problem. Cloudflare Workers AI is usage-based:

- Workers AI includes 10,000 Neurons/day at no charge.
- Paid usage above that allocation is billed at `$0.011 / 1,000 Neurons`.
- Flux STT (`@cf/deepgram/flux`) is currently `$0.0077/audio minute`.
- Aura 1 TTS (`@cf/deepgram/aura-1`) is currently `$0.015/1,000 input characters`.
- The proposed initial LLM, `@cf/openai/gpt-oss-20b`, is currently `$0.20/M input tokens` and `$0.30/M output tokens`.

A five-minute call therefore has a known STT floor of about `$0.0385`, plus TTS, LLM, Durable Object, and Worker usage. The exact per-call cost must be measured on staging because TTS character count, prompt/history growth, and retries vary by conversation. The migration must add a staging cost sample rather than rely on this estimate.

The remaining ElevenLabs access through September 8 should be used only for parity benchmarking. It is not a reason to delay implementation.

---

## 3. Fixed architecture decisions

These decisions are part of the approved implementation and should not be reopened unless implementation evidence proves one unsafe.

### 3.1 One implementation, not a provider abstraction

- Remove ElevenLabs code and dependencies in the migration branch.
- Do not add `VOICE_PROVIDER`, a provider interface, runtime switching, or duplicated client/server paths.
- Do not deploy a build containing both providers.
- Validate Cloudflare on staging while production remains pinned to the previous commit.
- Roll back production with a prebuilt compatibility artifact based on the previous ElevenLabs application code but retaining the applied Durable Object migration, binding, and an inert compatible class export. Cloudflare cannot roll a Worker version back across a Durable Object class migration.

This keeps the implementation smaller and avoids a temporary flag becoming permanent, brittle infrastructure.

### 3.2 One Durable Object per interview

The Durable Object instance name is the interview UUID. The client must use:

```ts
useVoiceAgent({
  agent: "VoiceAssessmentAgent",
  name: interviewId,
});
```

The SDK converts this to:

```text
/agents/voice-assessment-agent/{interviewId}
```

This gives each interview isolated SQLite conversation history and prevents transcript/context mixing across interviews.

### 3.3 Postgres remains the business source of truth

Durable Object SQLite is the live conversation store and reconnect buffer. Postgres remains authoritative for:

- interview ownership and lifecycle;
- communication assessment lifecycle;
- the normalized completed transcript;
- report generation eligibility;
- post-evaluation Workflow idempotency.

The existing `finalizeVoiceAssessmentFromTranscript()` transaction remains the only business completion path. Do not move report/business state exclusively into Durable Object SQLite.

### 3.4 Short-lived scoped connection capability cookie

Do not attempt to call TanStack Start's `useSession()` from the raw Worker fetch handler. It is designed for TanStack request context and the existing raw `app/server.ts` entrypoint does not establish that context for an Agent route.

Instead:

1. An authenticated server function issues a signed, short-lived capability in a `Secure`, `HttpOnly`, `SameSite=Strict` cookie.
2. The capability contains only `version`, `candidateId`, `interviewId`, `issuedAt`, and `expiresAt`.
3. It is HMAC-SHA256 signed with the existing high-entropy `SESSION_SECRET`, with a `roundzero:voice-capability:v1` domain prefix.
4. The cookie is named `rz-voice-{interviewId}` and scoped to the exact `/agents/voice-assessment-agent/{interviewId}` path, so parallel tabs do not overwrite each other's capabilities.
5. The raw Agent route reads the ordinary `Cookie` header, then verifies the signature, expiry, and path/claim equality.
6. The raw Agent route requires the request `Origin` to exactly match `APP_URL` before accepting an upgrade.
7. The raw route then performs fresh Postgres authorization before forwarding the WebSocket.

Use a 30-minute expiry initially: it is long enough for a short assessment plus reconnects, remains measured in minutes rather than hours, and matches the old ElevenLabs signed URL lifetime. Define `iat`, `exp`, and returned `expiresAt` consistently as Unix milliseconds. The token is scoped to one candidate and one interview and is useless once the interview/assessment becomes terminal.

Validate that `SESSION_SECRET` is at least 32 random bytes/characters before relying on it for capability signing; the current env schema only requires a string. Tighten the env validation if necessary and ensure deployed values comply before staging. Do not put raw session secrets, user profile data, candidate context, or job context in the capability.

The capability must not be placed in the WebSocket URL/query string. Cloudflare invocation logs can capture request URLs before application or Sentry redaction. The default `useVoiceAgent()` transport automatically sends same-origin cookies, so no custom transport is needed.

### 3.5 Explicit hangup is authoritative; browser fallback remains a safety net

Important SDK behavior in `@cloudflare/voice@0.3.5`:

- `VoiceClient.endCall()` immediately changes the browser to `idle`; it does not await `onCallEnd()`.
- The server runs async `onCallEnd()` as background work for the `end_call` protocol message.
- A raw WebSocket close/reconnect does **not** call `onCallEnd()`.
- `forceEndCall()` calls the internal end handler but does not await its async result.

Therefore:

- An intentional candidate hangup sends `end_call`; the Durable Object's `onCallEnd()` normalizes SQLite history and calls the existing finalizer.
- The browser polls Postgres and, after a short grace period, submits its local transcript through `completeMyVoiceAssessment()` if server finalization has not won.
- Both paths call the same idempotent Postgres finalizer, so they may safely race.
- A dropped WebSocket must **not** automatically finalize a partial transcript. It remains resumable from Durable Object history; the UI offers reconnect/retry.
- A call-start failure must not finalize old/empty history. Record a per-connection `callStarted` marker in `onCallStart()` and require it in `onCallEnd()`.
- Every completion path must require at least one non-empty candidate message. An assistant greeting alone is not an assessment.
- The committed SQLite history defines the completion cutoff. If the candidate ends while `thinking` or `speaking`, exclude the browser's trailing in-flight assistant message so the server and browser paths finalize an equivalent transcript.

### 3.6 No voice recordings in the initial Cloudflare implementation

The current application does not write `audio_key`; it only supports erasing one if present. The Cloudflare SDK design stores transcript history, not a RoundZero-owned recording.

- Do not add call recording in this migration.
- Keep the existing nullable `communication_assessments.audio_key` column and account-erasure cleanup for now. Removing it is unrelated schema churn and could prevent a future opt-in recording feature.
- Update documentation to state that the Cloudflare path stores transcripts but does not retain call audio in RoundZero storage.

### 3.7 Keep generic provider columns without repurposing them

Keep `provider_session_id` and `provider_conversation_id` nullable in the database to avoid an unnecessary migration. Cloudflare does not need them:

- leave both `NULL` for new Cloudflare assessments;
- remove ElevenLabs-only reads/writes and lookup queries;
- do not store the interview UUID in either column merely to make them non-null;
- consider deleting/renaming the columns only in a later schema cleanup.

### 3.8 Use Cloudflare's voice client directly, not a TanStack realtime adapter

TanStack AI's realtime abstraction currently documents first-party OpenAI Realtime and ElevenLabs adapters, not Cloudflare Voice. Wrapping `VoiceClient` in another custom `RealtimeAdapter` would recreate the protocol/lifecycle translation layer this migration is removing.

Use `@cloudflare/voice/react` directly for the browser voice session. Continue using TanStack AI/AI SDK where it already fits the text interview and model calls, but do not keep `useRealtimeChat` or create a Cloudflare adapter solely to preserve the old UI API. Cloudflare's hook already provides the required status, transcript, interim transcript, mic level, mute, metrics, start/end, and interruption behavior.

---

## 4. External prerequisite: export the ElevenLabs behavior before coding

The ElevenLabs agent's behavioral configuration is not in this repository. Before implementing the source-controlled Cloudflare prompt, export or manually copy from the ElevenLabs dashboard:

- system prompt;
- first message;
- configured voice ID and voice settings;
- LLM/model configuration;
- interruption/barge-in settings;
- turn eagerness, silence, and timeout settings;
- end-call tool/rules;
- maximum conversation duration;
- dynamic variable names and how each is used;
- webhook configuration;
- any pronunciation dictionary or specialized vocabulary.

Store the export outside Git if it contains secrets. Commit only the provider-neutral prompt/rules needed by the new implementation.

If the dashboard configuration cannot be recovered, stop claiming behavioral parity. Build a minimal communication-assessment prompt from `VoiceAssessmentContext`, then treat the staging benchmark as a fresh product acceptance test.

---

## 5. Exact SDK and model baseline

Pin the implementation baseline rather than using floating versions during the migration:

```json
{
  "@cloudflare/voice": "0.3.5",
  "agents": "0.20.1",
  "workers-ai-provider": "4.0.0"
}
```

The inspected `@cloudflare/voice@0.3.5` peer range accepts `agents >=0.17.1 <1.0.0`; `workers-ai-provider@4.0.0` accepts AI SDK 7, which is already installed.

Initial model/provider configuration:

```ts
transcriber = new WorkersAIFluxSTT(this.env.AI, {
  eotThreshold: 0.7,
  eotTimeoutMs: 5_000,
});

tts = new WorkersAITTS(this.env.AI, {
  model: "@cf/deepgram/aura-1",
  speaker: "asteria",
});

const workersAi = createWorkersAI({ binding: this.env.AI });
const model = workersAi("@cf/openai/gpt-oss-20b");
```

These are staging baselines, not untouchable product choices. Change a model/speaker only from source code after measuring latency, voice quality, instruction following, and cost. Do not add model env vars in this migration; model selection belongs in code, matching `app/shared/openrouter.ts` policy.

Use `context.signal` as the LLM `abortSignal` so interruptions cancel in-flight generation. Keep spoken replies concise and return AI SDK `result.stream` so tool/text stream boundaries remain intact. Voice 0.3.5 accepts `textStream` but warns that it loses separated parts/tool-call information.

Do not enable multiple Flux keyterms until the SDK behavior is fixed or verified: Voice 0.3.5 accepts an array but currently forwards only the first keyterm.

---

## 6. Phase 1: dependencies and Worker bindings

### 6.1 Update dependencies

**Files:**

- `package.json`
- `bun.lock`

**Actions:**

1. Remove `@elevenlabs/client`.
2. Add the pinned packages above.
3. Do not add `@cloudflare/voice-elevenlabs` or any alternate provider package.

**Commands:**

```bash
bun remove @elevenlabs/client
bun add @cloudflare/voice@0.3.5 agents@0.20.1 workers-ai-provider@4.0.0
```

**Expected result:** lockfile contains one Cloudflare Voice/Agents stack and no ElevenLabs client.

### 6.2 Add bindings and the SQLite-backed Durable Object migration

**File:** `wrangler.jsonc`

Add an AI binding and a Durable Object binding whose binding name and class name both exactly match `VoiceAssessmentAgent`:

```jsonc
"ai": { "binding": "AI" },
"durable_objects": {
  "bindings": [
    {
      "name": "VoiceAssessmentAgent",
      "class_name": "VoiceAssessmentAgent",
    },
  ],
},
"migrations": [
  {
    "tag": "v1",
    "new_sqlite_classes": ["VoiceAssessmentAgent"],
  },
],
```

`ai` and `durable_objects` are non-inheritable Wrangler bindings. Add the complete binding blocks at root, `env.staging`, and `env.production`. Keep a single top-level `v1` migration; migration history is applied independently to each deployed environment. Inspect the environment-selected generated `dist/server/wrangler.json` for staging and production rather than assuming source config inheritance.

Keep the current placement settings. Use `routeAgentRequest(..., { locationHint: "enam" })` because the Worker/Hyperdrive placement is already eastern North America and every turn/finalization reads US-east Postgres.

### 6.3 Regenerate Worker types

Run:

```bash
bun run cf-typegen
```

Do not hand-edit `worker-configuration.d.ts`. Confirm its generated `Env` includes:

- `AI`;
- `VoiceAssessmentAgent` Durable Object namespace;
- all existing bindings.

### 6.4 Configuration validation

Before writing the Agent, run a Wrangler config/type dry run supported by the installed Wrangler version and inspect the resolved staging environment. A missing environment-specific binding must block staging deployment.

---

## 7. Phase 2: source-controlled voice runtime

### 7.1 Add the provider-neutral voice prompt

**Preferred file:** `app/features/interviews/shared/voice-runtime.ts`  
**Existing symbol to retain:** `loadVoiceAssessmentContext()`

Extend the existing module instead of creating a second voice-context module. Add:

- a prompt version constant;
- `buildVoiceAssessmentSystemPrompt(context)`;
- a first-message builder if the exported ElevenLabs first message is dynamic;
- concise spoken-response constraints;
- explicit untrusted-data boundaries around candidate/job content;
- explicit end-assessment behavior matching the exported ElevenLabs rule;
- at most one bounded STT keyterm from the job/context only if staging proves it helps and the Voice SDK's current single-keyterm limitation is accepted.

The prompt must:

- identify Zero and the purpose as a communication assessment;
- use candidate/job context to ask natural, relevant questions;
- assess communication without revealing scores or private pre-evaluation data;
- ask one question at a time;
- keep responses short enough for low TTS cost and natural latency;
- avoid markdown, lists, JSON, and multi-question monologues;
- refuse to follow instructions embedded in candidate/job/resume text;
- finish politely after sufficient communication evidence or an explicit request to stop;
- not duplicate the text interview's screening-question coverage workflow.

Do not reuse `buildInterviewSystemPrompt()` unchanged. That prompt contains text-interview structured-output and `record_screening_coverage` instructions that are not the voice assessment's contract.

### 7.2 Add `VoiceAssessmentAgent`

**New file:** `app/features/interviews/server/voice-agent.ts`  
**Entry-point export:** `app/server.ts`

Use:

```ts
const VoiceAgentBase = withVoice(Agent, {
  historyLimit: 40,
  maxMessageCount: 500,
  audioFormat: "mp3",
});

export class VoiceAssessmentAgent extends VoiceAgentBase<Env> {
  // providers and hooks
}
```

Forty context messages is enough for the intended short assessment. Five hundred persisted messages leaves recovery headroom while matching the browser fallback's existing server validation maximum. Do not pass all 500 messages to every LLM turn.

#### `onConnect(connection, context)`

The raw Worker route is the primary authorization boundary. `onConnect()` is defense in depth:

- verify the request URL has a syntactically valid interview UUID matching `this.name` if the SDK exposes the instance name;
- validate the credential/path again from `ConnectionContext.request` if defense in depth is desired, then set a connection-specific marker; router `props` are Agent startup inputs and must not be treated as per-reconnect identity;
- respond to a client `request_voice_history` custom message with bounded SQLite history so reconnecting UI can reconstruct prior turns; do not push it immediately from `onConnect()` because the React custom-message listener may not yet be attached;
- never send candidate summary, prompt, scores, metadata, or internal context to the browser.

Use `static options = { sendIdentityOnConnect: false }` if compatible with the mixin, so the SDK does not expose internal instance identity unnecessarily. The interview UUID is already present in the route, so this is defense in depth, not secrecy.

#### `beforeCallStart(connection)`

- enforce one active speaker/call per interview instance;
- reject a second simultaneous call;
- perform a fresh Postgres status check if the route-to-call delay can be material;
- require `interviews.status === "awaiting_voice"`;
- require assessment status to be absent, `pending`, or `in_progress`;
- reject `completed`, `skipped`, cancelled, withdrawn, expired, or missing state.

Do not trust token claims for current lifecycle state.

#### `onCallStart(connection)`

1. Mark connection state with `callStarted: true` and `startedAt`.
2. Create/reuse the assessment idempotently.
3. Transition assessment `pending → in_progress`, setting `started_at = COALESCE(started_at, now())`.
4. Load authoritative context with `getInterviewContextById()` and `loadVoiceAssessmentContext()`.
5. If SQLite history is empty, call `speak()` once with the source-controlled first message. `speak()` persists the assistant message after successful synthesis; do not call `saveMessage()` separately or the greeting will be duplicated.
6. If history exists after reconnect, do not restart the interview; speak a short resume line only if product testing shows it is helpful.
7. Start a maximum-call-duration guard. Initial hard maximum: 10 minutes for a product target of roughly 5 minutes.

The current UI already maps DB `in_progress` to `in_call`, but the ElevenLabs path never reliably writes it. This phase must add the missing write and tests.

#### `onTurn(transcript, context)`

1. Ignore empty/noise-only transcripts in `afterTranscribe()` rather than sending them to the LLM.
2. Load/build authoritative prompt context on the server; browser data is untrusted.
3. Construct Workers AI messages from the bounded `context.messages`; do not append `transcript` a second time because the Voice mixin saves the user message before calling `onTurn()` and includes it in `context.messages`.
4. Call `streamText()` using `workers-ai-provider`, `@cf/openai/gpt-oss-20b`, and `context.signal`.
5. Apply low temperature and an output-token ceiling appropriate for fewer than 80 spoken words.
6. Return `result.stream` so the Voice mixin can preserve AI SDK stream parts while sentence-chunking and synthesizing concurrently.
7. Log only timing/model/error metadata. Never log transcript, prompt, candidate summary, or generated response.

Map the exported ElevenLabs end-call behavior using AI SDK server tools only if the existing dashboard actually uses a tool. Any tool must close over server-owned connection/interview state; it must not accept an interview ID from model output.

#### End-of-assessment behavior

Cloudflare Voice currently has no documented “audio playback drained” callback. Do not blindly call `forceEndCall()` as soon as the final text stream completes, because the browser may still have queued TTS audio.

Implement this in two checkpoints:

1. **Safe initial staging behavior:** Zero speaks a closing line and the UI clearly presents “End assessment”; candidate hangup finalizes normally. The 10-minute guard still prevents unbounded calls.
2. **Parity checkpoint:** test whether an Agent-triggered end clips the closing audio in Chrome, Safari, and mobile. If it does not clip, enable it. If it clips, keep explicit client hangup or send a custom `assessment_complete` message and let the browser end only after playback status returns from `speaking` to `listening` plus a small measured buffer.

Do not ship a guessed timeout based only on word count without staging evidence.

For the 10-minute hard limit, send a custom `{ type: "assessment_complete", reason: "duration_limit" }` before server cleanup and run authoritative finalization from committed SQLite history. The browser then runs the same grace/fallback flow when it receives the reason. Do not rely on generic `idle` from `forceEndCall()` to communicate why the call ended, and do not rely on the non-awaited `forceEndCall()` callback alone to persist completion.

#### `onCallEnd(connection)`

- return early if `connection.state.callStarted !== true` so startup failures do not finalize stale history;
- clear active-speaker and maximum-duration state;
- read up to 500 SQLite messages with `getConversationHistory(500)`;
- normalize `user → candidate`, retain `assistant`, trim empty content;
- treat this as committed history; do not assume an assistant message briefly displayed before interrupted/unfinished synthesis is present;
- require at least one candidate message before finalization;
- call `finalizeVoiceAssessmentFromTranscript()`;
- allow the existing finalizer to launch post-evaluation;
- catch/report errors without transcript content, knowing the browser fallback remains available;
- tolerate repeated calls and races.

Do not clear SQLite history after completion. It is needed for Beta incident diagnosis/recovery until the Durable Object retention policy is deliberately implemented.

#### WebSocket drop/reconnect

The mixin does not invoke `onCallEnd()` on raw socket close. Preserve that behavior intentionally:

- track the active speaker by connection ID and clear it in `onClose()` only when the closing ID still owns the marker;
- do not finalize on `onClose()`;
- preserve SQLite history;
- allow the same candidate/interview capability to reconnect while valid;
- rerun route authorization on every PartySocket reconnect;
- issue a fresh capability from the authenticated server function when the candidate explicitly retries after token expiry.

Define and test old-close/new-start ordering. A replacement connection may arrive before the old `onClose()`: allow takeover only when the old connection is no longer present in `getConnections()`, otherwise reject briefly and let PartySocket retry. Never let an old close clear a newer connection's ownership.

### 7.3 Export the class

In `app/server.ts`:

```ts
export { VoiceAssessmentAgent } from "./features/interviews/server/voice-agent";
```

The export name, Wrangler `class_name`, binding name, client `agent`, and URL path must all resolve to the same class.

---

## 8. Phase 3: authentication and routing

### 8.1 Add capability signing/verification

**New file:** `app/features/interviews/server/voice-capability.ts`

This helper is justified because it is used by both the authenticated server function and the raw Worker route. Keep its API small:

```ts
type VoiceCapabilityClaims = {
  v: 1;
  candidateId: string;
  interviewId: string;
  iat: number; // Unix milliseconds
  exp: number; // Unix milliseconds
};

signVoiceCapability(claims, secret): Promise<string>
verifyVoiceCapability(token, secret): Promise<VoiceCapabilityClaims | null>
```

Requirements:

- compact base64url payload and signature;
- HMAC-SHA256 via Web Crypto;
- strict Zod claims validation;
- constant-time signature comparison;
- version and expiry checks;
- reject malformed encodings without throwing user-visible internals;
- no refresh token, JavaScript-visible value, URL value, or localStorage persistence.

### 8.2 Replace token provisioning server function

**File:** `app/features/interviews/server/functions.ts`

Replace `getMyVoiceToken` with a provider-neutral preflight function such as `prepareMyVoiceConnection`:

```ts
{
  expiresAt: number;
}
```

The handler must:

1. use `authMiddleware`;
2. require `context.user.role === "candidate"`;
3. load via `getInterviewForCandidateById(interviewId, candidateId)`;
4. require `interview.status === "awaiting_voice"`;
5. reject completed/skipped assessment;
6. idempotently create a `pending` assessment if absent;
7. sign the capability scoped to that candidate and interview;
8. call `setCookie()` from `@tanstack/react-start/server` with `HttpOnly`, `SameSite=Strict`, exact Agent-instance `Path`, 30-minute `Max-Age`, and `Secure` outside local development;
9. return only the Unix-millisecond expiry, with no token or prompt/candidate/job details visible to JavaScript.

Remove:

- `RealtimeToken`;
- ElevenLabs API key/agent ID checks;
- ElevenLabs REST fetch;
- signed URL parsing;
- dynamic variables;
- provider session creation/registration;
- `registerMyVoiceAssessmentSession`.

### 8.3 Add the raw authenticated Agent route

**File:** `app/server.ts`  
**Likely testable helper:** keep matching/authorization in a narrow function under `app/features/interviews/server/voice-agent-route.ts` only if doing so materially improves tests; do not add a wrapper that merely calls `routeAgentRequest()`.

Before TanStack's handler, intercept only:

```text
/agents/voice-assessment-agent/{UUID}
```

For every request to `/agents/`:

1. Require an exact recognized path. Return 404 for unknown agent classes, `default`, malformed IDs, subpaths, and alternate casing.
2. Require a WebSocket upgrade for this path. Do not expose arbitrary Agent HTTP/RPC methods.
3. Require the request `Origin` to exactly equal the origin derived from `env.APP_URL`.
4. Parse the ordinary `Cookie` request header and read only `rz-voice-{interviewId}`.
5. Verify signature and expiry.
6. Require path interview UUID equals capability `interviewId`.
7. Load the current user by capability `candidateId`; require the user still exists and has role `candidate`.
8. Load `getInterviewForCandidateById()`; this proves ownership.
9. Require interview `awaiting_voice` and assessment non-terminal.
10. Forward the unchanged request with `routeAgentRequest(request, env, { locationHint: "enam" })`.
11. Require a non-undefined Agent response; otherwise return 404.

Never call a catch-all `routeAgentRequest()` elsewhere in `app/server.ts`. That is the key guarantee that `/agents/voice-assessment-agent/default` and other guessed paths cannot bypass authorization.

The forwarded request must remain unchanged so the `Upgrade` header, query, method, and protocol survive.

Return generic 401/403/404 responses without leaking whether another candidate's interview exists. Prefer 404 for ownership mismatch.

### 8.4 Keep the capability out of telemetry

The capability cookie is `HttpOnly` and absent from the URL. Keep Sentry's `sendDefaultPii: false`, do not attach request cookies to custom events, and do not log the raw `Cookie` header. Cloudflare/Sentry staging review must confirm neither capability value nor transcript appears in logs/traces.

---

## 9. Phase 4: database lifecycle queries

**File:** `app/features/interviews/queries/queries.sql`  
**Generated output:** regenerate `queries_sql.ts`; never edit it manually

### 9.1 Add idempotent assessment creation

Replace race-prone read-then-insert behavior with a query that safely handles concurrent token requests. Preferred shape:

```sql
-- name: createCommunicationAssessmentIfAbsent :exec
INSERT INTO communication_assessments (interview_id, application_id, status)
VALUES ($1, $2, 'pending')
ON CONFLICT (interview_id) DO NOTHING;
```

Then re-read with `getCommunicationAssessmentByInterviewId()` when the row is needed.

### 9.2 Add call-start transition

```sql
-- name: startCommunicationAssessment :one
UPDATE communication_assessments
SET status = 'in_progress',
    started_at = COALESCE(started_at, now()),
    updated_at = now()
WHERE interview_id = $1
  AND status IN ('pending', 'in_progress')
RETURNING *;
```

This fills the current lifecycle gap observed by the UI.

### 9.3 Remove provider-specific queries

Delete these if no non-ElevenLabs caller remains:

- `getCommunicationAssessmentByProviderConversationId`;
- `getCommunicationAssessmentByProviderSessionId`;
- `registerCommunicationAssessmentSession`;
- `registerCommunicationAssessmentConversation`.

Keep the generic columns as nullable schema fields.

### 9.4 Regenerate and validate

Run:

```bash
bun run sqlgen
```

No database migration is expected in this phase because the existing status/timestamp fields and unique interview relationship are sufficient. Before relying on `ON CONFLICT (interview_id)`, verify the schema has an exact unique constraint/index on `communication_assessments.interview_id`; add a new dbmate migration only if it does not.

---

## 10. Phase 5: client migration

### 10.1 Rewrite the voice panel around `useVoiceAgent`

**File:** `app/features/interviews/components/voice-assessment-panel.tsx`

Remove:

- TanStack `RealtimeToken` and `useRealtimeChat`;
- `voiceRealtimeAdapter`;
- conversation registration mutation/refs;
- ElevenLabs conversation IDs;
- webhook-specific comments and naming.

Run `prepareMyVoiceConnection()` when the eligible voice panel becomes active, then mount/enable `useVoiceAgent()` after the HttpOnly capability cookie has been set:

```ts
const voice = useVoiceAgent({
  agent: "VoiceAssessmentAgent",
  name: interviewId,
  enabled: prepared && !isTerminal,
});
```

Do not fetch the capability in a route `beforeLoad`; invoke one explicit preflight when the voice panel is active. Avoid repeated preparation calls during render/polling. After preparation, allow the hook to establish its idle WebSocket before the candidate's Start click.

Map SDK state directly:

| Cloudflare value    | Existing UI behavior                                |
| ------------------- | --------------------------------------------------- |
| `status: idle`      | ready/finalizing depending on local intent          |
| `status: listening` | “Listening” + interim transcript                    |
| `status: thinking`  | thinking bubble/status                              |
| `status: speaking`  | “Zero is speaking”                                  |
| `audioLevel`        | input waveform                                      |
| `transcript`        | live assistant/user transcript                      |
| `interimTranscript` | candidate interim bubble                            |
| `error`             | retryable connection issue                          |
| `connected`         | socket diagnostic, not equivalent to an active call |

Normalize `TranscriptMessage` with its actual `{ role, text, timestamp }` shape:

- `user → candidate` for completion;
- `assistant → assistant`;
- trim empty messages;
- continue de-duplicating DB terminal history and live history by normalized role/text.

After `connected` becomes true and the hook's custom-message listener is installed, send `{ type: "request_voice_history" }`. Consume the response and merge it before current live messages. Validate it with a client-side Zod schema; never trust arbitrary custom WebSocket data. Keep recovered/live history in application-owned parent state so remounting the hook for a refreshed cookie does not erase the fallback transcript.

### 10.2 Start behavior

Preparation and Start are deliberately separate phases. The panel may display “Preparing voice assessment” while the cookie/socket preflight runs. Enable the actual Start button only after `voice.connected === true`; its click must synchronously call `startCall()` within that fresh user gesture.

The Start button handler must:

1. clear prior client error/submission state;
2. require a prepared, connected voice client;
3. call `startCall()` synchronously from the click gesture so microphone permission is valid;
4. surface permission denial with actionable copy;
5. never mark DB completion merely because mic startup failed.

Do not await capability provisioning and then call `startCall()` in the same original click: React has not mounted the new Voice client yet, and the browser activation may be lost. On expiry/auth failure, run the preflight again, remount a small Voice-client child keyed by returned `expiresAt`, wait for `connected`, and require a new Start click. This child is lifecycle isolation, not a generic provider wrapper.

### 10.3 Intentional end and finalization fallback

The End button handler must:

1. mark a local `endRequested` flag;
2. snapshot the latest committed live + recovered transcript, excluding a trailing assistant message when ending during `thinking`/`speaking`;
3. call `voice.endCall()`;
4. immediately invalidate/refetch the assessment query;
5. allow a short server-finalization grace window (initially 3 seconds, retain the existing value unless staging proves it too short);
6. if Postgres is still non-terminal, call `completeMyVoiceAssessment()` with the snapshot;
7. poll/invalidate until completed or expose “Try again”.

This is no longer “webhook-first”; rename comments/constants to `SERVER_FINALIZATION_GRACE_MS`.

Do not invoke browser fallback for an unexplained WebSocket error/drop. Show reconnect/retry so Durable Object history can resume. A partial transcript should only complete after explicit candidate/agent end or maximum-duration termination.

### 10.4 Agent-requested end

If staging enables Agent-requested completion or the maximum-duration guard fires, handle a validated custom message such as:

```ts
{
  type: "assessment_complete";
}
```

Wait until the closing response is no longer `speaking`, then run the same intentional-end path. Include a machine-readable reason (`agent_complete` or `duration_limit`) so a server-initiated idle state cannot be mistaken for an unexplained drop and can still use the browser grace/fallback path. Do not create a second completion implementation.

### 10.5 UI parity and improvements

Preserve:

- start/retry/end controls;
- transcript bubbles;
- interim transcript;
- thinking/speaking/listening status;
- microphone level visualization;
- terminal completed/skipped screens;
- finalization failure retry;
- polling of DB terminal state.

Add mute control only if it fits the existing panel without redesign; `toggleMute()` is available but not required for provider parity.

### 10.6 Delete the adapter

Delete:

- `app/features/interviews/shared/voice-realtime-adapter.ts`

Do not replace it with another generic adapter. The Cloudflare React hook is now the direct client integration.

---

## 11. Phase 6: remove ElevenLabs webhook/runtime code

### 11.1 Simplify `voice-assessment.ts`

**File:** `app/features/interviews/server/voice-assessment.ts`

Delete:

- ElevenLabs webhook schemas;
- signature verification;
- webhook payload parsing;
- conversation/session ID helpers;
- ElevenLabs-specific transcript normalization.

Keep:

- `VoiceTranscriptMessage`;
- expressive-tag stripping if it remains useful for historic data and finalizer input;
- `finalizeVoiceAssessmentFromTranscript()`;
- post-evaluation launch;
- communication analysis/scoring helpers.

Strengthen `finalizeVoiceAssessmentFromTranscript()` itself to require at least one non-empty `candidate` message after normalization. This shared invariant protects the Durable Object path and authenticated browser fallback equally; checking only in callers is insufficient.

Rename any comments that imply the transcript always comes from ElevenLabs/webhooks.

### 11.2 Delete webhook route

Delete:

- `app/routes/api/voice-webhook.ts`

Regenerate the TanStack route tree using the repository's normal dev/build generator. Do not hand-edit `app/routeTree.gen.ts` unless that file's generator workflow explicitly does so.

Remove `/api/voice-webhook` from `robots.txt` in `app/server.ts`.

### 11.3 Remove deployment secrets

Delete ElevenLabs entries from:

- `.env.example`;
- `.github/workflows/deploy.yml` `.env.ci` heredoc;
- `.github/workflows/deploy-production.yml` `.env.ci` heredoc.

Remove:

- `ELEVENLABS_API_KEY`;
- `ELEVENLABS_AGENT_ID`;
- `ELEVENLABS_WEBHOOK_SECRET`.

Do not delete GitHub environment secrets during implementation unless the user explicitly requests the shared/destructive action. After production cutover and rollback-window expiry, the user can remove them from staging/production GitHub environments and delete the ElevenLabs dashboard webhook/agent.

No new Worker secret is needed: Workers AI uses the `AI` binding, and capability signing reuses `SESSION_SECRET`.

---

## 12. Phase 7: tests

Follow existing Vitest/Postgres conventions. Do not add per-test cleanup hooks; global setup owns cleanup.

### 12.1 Capability tests

**New test:** `app/features/interviews/server/__tests__/voice-capability.test.ts`

Cover:

- valid round trip;
- tampered payload;
- tampered signature;
- expired token;
- wrong version;
- malformed base64url/JSON;
- candidate/interview claim validation;
- constant-time comparison path handles different-length signatures safely.

### 12.2 Raw route authorization tests

Add focused tests around the extracted route authorization function or Worker handler mocks. Required cases:

1. unauthenticated/no-token WebSocket rejected;
2. malformed/expired/tampered token rejected;
3. non-candidate user rejected;
4. candidate accessing another candidate's interview rejected;
5. token interview claim differing from path rejected;
6. malformed UUID/default instance rejected;
7. interview not in `awaiting_voice` rejected;
8. completed/skipped assessment rejected;
9. correct request routes to exactly the interview-ID Durable Object;
10. request forwarded unchanged;
11. unknown `/agents/*` route never reaches `routeAgentRequest()`;
12. non-WebSocket HTTP/RPC request rejected;
13. no catch-all/default Agent route bypass exists.

Here “no token” means no interview-scoped capability cookie. Also test wrong/missing/cross-origin `Origin`, the exact cookie path/name, parallel-interview cookies, and that no capability appears in the URL passed to `routeAgentRequest()`.

### 12.3 Assessment lifecycle tests

Extend `app/features/interviews/server/__tests__/voice-assessment.test.ts` and add Agent-hook tests where practical:

- concurrent connection-token requests create one assessment;
- first accepted call sets status `in_progress` and `started_at`;
- retry/reconnect preserves original `started_at`;
- call-start failure does not complete assessment;
- Cloudflare roles normalize `user → candidate` and `assistant → assistant`;
- empty or assistant-only history does not complete;
- browser fallback and DO committed history use the same cutoff when end is requested during `thinking`/`speaking`;
- explicit call end finalizes once;
- repeated `onCallEnd`, browser fallback, and retry remain idempotent;
- completed assessment starts post-evaluation exactly once by its existing idempotency key;
- skipped/cancelled/withdrawn terminal state wins races;
- browser fallback cannot overwrite an authoritative completed transcript;
- provider columns remain null.

Retain all existing finalizer transaction/race tests. Remove only webhook-format tests that are no longer relevant.

### 12.4 Agent behavior contract validation

The current `vitest.config.ts` is Node Vitest with a simple `cloudflare:workers` mock. It cannot faithfully instantiate Agent Durable Objects, SQLite, hibernatable WebSockets, or `withVoice` dispatch. Do not write mocks that claim to prove those runtime contracts.

Keep pure prompt normalization, Postgres state, route authorization decisions, provider request construction, and transcript-cutoff logic in ordinary Vitest. Make the following real-runtime cases mandatory staging evidence unless the implementer deliberately adds a small separate `@cloudflare/vitest-pool-workers` project:

- one Durable Object history belongs to one interview;
- first call speaks one greeting and persists it;
- reconnect does not restart from an empty interview;
- `context.messages` is not duplicated with the latest transcript;
- candidate/job content cannot become system instructions;
- interruption abort signal reaches LLM generation;
- simultaneous second call is rejected;
- 10-minute guard ends/finalizes once;
- custom reconnect history contains only roles/content, not private context;
- errors/logs omit transcript and capability token.

If adding a Workers Vitest project, keep it limited to Agent/DO/WebSocket contracts and run it separately from the existing sequential Postgres suite. Otherwise record each item in the staging checklist with evidence. Do not assert Cloudflare's own SDK internals; assert RoundZero hooks and transitions.

### 12.5 Client behavior tests

If the repo lacks component-test infrastructure, extract only the transcript/status/finalization state logic that is complex enough to unit test; do not introduce a full browser-test framework solely for this migration.

Required behavior coverage or manual staging evidence:

- Start button waits for a valid capability and user gesture;
- microphone permission denial gives retryable UX;
- `idle/listening/thinking/speaking` map correctly;
- interim and final transcripts render correctly;
- recovered history de-duplicates live transcript;
- intentional end runs one fallback after grace;
- dropped socket does not finalize partial transcript;
- expired-token retry fetches a fresh capability;
- submit failure exposes a working retry button;
- completion transitions to existing terminal UI.

### 12.6 Telemetry validation

Assert route helpers never add the capability to URLs or logs. On staging, inspect Cloudflare invocation logs/traces and Sentry to confirm the HttpOnly capability cookie value and transcript content are absent.

---

## 13. Phase 8: local and staging validation

### 13.1 Mandatory repository checks

After each implementation slice, and once at the end:

```bash
bun run sqlgen       # after SQL edits
bun run cf-typegen   # after binding edits
bun run check        # required after every change
bun run test
bun run build
```

Also run focused tests while iterating, for example:

```bash
bun run test app/features/interviews/server/__tests__/voice-capability.test.ts
bun run test app/features/interviews/server/__tests__/voice-assessment.test.ts
```

Do not report success if local Workers AI/Voice behavior was only mocked.

### 13.2 Local runtime smoke test

With local Postgres and `bun run dev`:

1. seed a candidate/interview at `awaiting_voice`;
2. open voice assessment;
3. confirm capability issuance;
4. confirm exact Agent URL and WebSocket upgrade;
5. grant mic permission;
6. hear first message;
7. speak at least three turns;
8. interrupt Zero while speaking;
9. inspect interim/final transcript;
10. end intentionally;
11. verify Postgres statuses/transcript;
12. verify one post-evaluation Workflow instance starts.

Workers AI binding behavior may require remote resources. If local simulation cannot exercise Flux/Aura, record that limitation and make staging smoke mandatory before acceptance.

### 13.3 Staging deploy checklist

Deploy only after Wrangler resolves `AI` and `VoiceAssessmentAgent` in staging.

On staging verify:

- Durable Object migration created successfully;
- authenticated WebSocket connects over `wss://`;
- unauthorized and cross-interview attempts fail;
- no alternate Agent path connects;
- Flux receives and transcribes 16 kHz PCM;
- Aura audio plays without decode issues;
- first-audio and full-turn latency from `metrics`;
- barge-in/interruption behavior;
- Chrome desktop;
- Safari desktop;
- at least one mobile browser if practical;
- permission denial;
- tab background/foreground;
- network offline/online reconnect;
- refresh during an incomplete assessment;
- explicit end;
- max-duration end;
- DB finalization and report generation;
- no token/transcript in Sentry or Cloudflare logs;
- Workers AI/DO usage and cost visible in Cloudflare dashboards.

### 13.4 Side-by-side benchmark with remaining ElevenLabs credits

Run the same scripted interview prompts on staging Cloudflare and the still-available ElevenLabs agent. Use at least five representative sessions, including technical terms and different microphone/network conditions.

Capture:

| Dimension           | Measurement                                            |
| ------------------- | ------------------------------------------------------ |
| Time to first audio | median and worst observed per turn                     |
| End-of-turn delay   | pause to “thinking”                                    |
| STT accuracy        | key names, technologies, numbers, accents              |
| Interruption        | whether playback stops and response recovers           |
| Prompt parity       | one question, relevance, no private-data disclosure    |
| Completion          | transcript complete, DB terminal, Workflow launched    |
| Reconnect           | context retained and no duplicate greeting             |
| Voice quality       | human rating and clipping/dropout notes                |
| Cost                | estimated/observed cost per completed five-minute call |

Do not retain candidate production PII for this benchmark; use test data and scripted participants.

---

## 14. Phase 9: documentation, privacy, and cleanup

Update all provider-specific documentation in the same implementation branch.

### 14.1 `AI-LAYER.md`

- replace “stored ElevenLabs transcript” with provider-neutral stored voice transcript;
- describe Cloudflare Agent/DO, Workers AI Flux/LLM/Aura pipeline;
- retain post-eval voice scoring and communication blend formula;
- document that finalization is server-first with idempotent browser fallback.

### 14.2 `ARCHITECTURE.md`

- replace ElevenLabs in the stack list;
- document `VoiceAssessmentAgent`, one DO per interview, SQLite live history, and Postgres final transcript;
- document authenticated Agent route and capability claims;
- document AI/DO Wrangler bindings;
- remove ElevenLabs env vars from the environment table;
- state that prompt/personality are source-controlled;
- state that audio is not retained by RoundZero in this implementation;
- retain generic provider columns as nullable legacy schema.

### 14.3 `PLATFORM.md`

Product behavior should remain largely unchanged. Update only provider/runtime claims if any. Do not change the required voice-assessment product requirement or evidence-weighted communication scoring.

### 14.4 Privacy/subprocessor copy

**File:** `app/routes/privacy.tsx`

Replace the ElevenLabs subprocessor entry with accurate Cloudflare and partner processing language. Cloudflare-hosted Flux/Aura are Deepgram partner models, so legal copy should not misleadingly imply only Cloudflare handles speech data. Verify applicable Cloudflare/Workers AI and Deepgram terms/data-processing behavior before choosing the final wording.

Do not claim recordings are stored. State transcript retention consistently with current account-erasure behavior.

### 14.5 Account erasure

Keep existing `audio_key` cleanup and tests. Postgres transcript deletion alone does not erase the same history from Durable Object SQLite, while the current product/privacy contract promises permanent voice-transcript erasure after the grace period. DO erasure is therefore mandatory before production cutover, not an optional legal exception.

Add an internal, idempotent Agent RPC such as `eraseConversationHistory()` that clears `cf_voice_messages` for that interview. It must be reachable only through the Worker-owned `VoiceAssessmentAgent` namespace/stub, never through the public WebSocket-only route.

Extend account cleanup to:

1. list all candidate interview UUIDs before Postgres redaction;
2. call `getAgentByName(env.VoiceAssessmentAgent, interviewId).eraseConversationHistory()` for each;
3. retain existing R2/audio and Postgres cleanup behavior;
4. avoid stamping the user as anonymized if any DO clear fails, allowing the scheduled workflow to retry safely;
5. test successful deletion, no-existing-history, repeated deletion, and partial failure.

Staging implementation may proceed in phases, but production acceptance requires the erasure path and failure semantics to pass.

### 14.6 Final reference sweep

Run:

```bash
rg -n -i "elevenlabs|eleven labs|voice-webhook|ELEVENLABS_|@elevenlabs" \
  AI-LAYER.md ARCHITECTURE.md PLATFORM.md app package.json wrangler.jsonc .github .env.example \
  --glob '!**/*_sql.ts'
```

Expected result: no active runtime/config/privacy references. Historical migration plans may retain the name as historical context.

Also search for stale “webhook-first”, conversation registration, and provider session terminology.

---

## 15. Production cutover criteria

Do not merge/deploy to production merely because staging connects once. All of the following must be true:

### Security

- no unauthenticated Agent path;
- no default-instance bypass;
- ownership and candidate-role checks pass;
- terminal states reject new calls;
- capability cookie is scoped, expires, is origin-protected, and is absent from URLs/telemetry;
- no prompt/candidate summary is sent to browser;
- privacy/subprocessor language reviewed.

### Reliability

- explicit hangup completes exactly once;
- browser fallback wins safely when DO finalization is delayed/fails;
- dropped connections remain resumable and do not silently complete partial calls;
- DO restart/reconnect retains context;
- post-evaluation starts once;
- max call duration works;
- empty transcript cannot terminally complete;
- account erasure handles both Postgres and DO transcript copies and retries safely on partial failure.

### Product quality

- median first-audio latency is acceptable relative to ElevenLabs;
- STT accuracy is acceptable on role-specific vocabulary;
- interruptions work without corrupting conversation history;
- final responses are concise and ask one question;
- closing behavior does not clip audio;
- voice quality is acceptable in supported browsers;
- the call stays near the intended short-assessment length.

### Cost/operations

- observed staging cost per representative call is recorded;
- Cloudflare billing alert/usage visibility is configured;
- no ElevenLabs API requests occur in the build;
- staging AI/DO migrations are proven;
- the DO-compatible ElevenLabs rollback artifact and deploy command are recorded and tested.

---

## 16. Production deployment and rollback

### Cutover

1. Record the currently deployed production commit and build/test the DO-compatible ElevenLabs rollback artifact from it.
2. Ensure no production voice calls are actively in progress during deploy if operationally possible.
3. Deploy the Cloudflare-only commit, including DO migration and AI binding.
4. Run one synthetic production candidate assessment.
5. Verify DB completion, post-evaluation, Sentry, Cloudflare AI metrics, and absence of ElevenLabs traffic.
6. Monitor failures, latency, and cost closely during the Beta soak period.

### Rollback

A previous commit without the Durable Object class/migration cannot be redeployed after production has applied `new_sqlite_classes`. Before cutover, prepare a compatibility artifact that restores the previous ElevenLabs application behavior while retaining:

- the applied top-level `v1` migration history;
- the `VoiceAssessmentAgent` binding in root, staging, and production config;
- an exported inert/compatible `VoiceAssessmentAgent` class and required dependency;
- no browser route to the inert class.

If Cloudflare Voice has a material Beta outage/regression:

1. deploy that compatibility artifact, not the untouched old commit;
2. confirm ElevenLabs secrets/webhook/agent have not yet been deleted;
3. run a synthetic ElevenLabs voice assessment;
4. inspect interviews left `awaiting_voice`/assessments `pending|in_progress` and let candidates retry;
5. do not manually rewrite completed transcripts or statuses unless a specific incident requires it.

Do not add a `deleted_classes` migration or attempt to delete the namespace during incident rollback.

Delete ElevenLabs GitHub secrets/dashboard webhook only after the Cloudflare production soak and rollback window are complete.

---

## 17. Recommended implementation order and review checkpoints

Implement in this order to keep failures easy to isolate:

1. Export ElevenLabs dashboard behavior.
2. Add/pin packages and Worker bindings; regenerate Worker types.
3. Add SQL lifecycle queries; regenerate SQLC.
4. Add capability helper and tests.
5. Add authenticated raw route and bypass tests.
6. Add source-controlled prompt/context.
7. Add `VoiceAssessmentAgent` and hook tests.
8. Rewrite the client panel while keeping existing fallback/finalizer.
9. Prove local/staging completion end-to-end.
10. Delete ElevenLabs adapter/webhook/provider code.
11. Remove dependencies/secrets wiring and regenerate route tree.
12. Update docs/privacy/data-erasure handling.
13. Run full checks and side-by-side benchmark.
14. Independent security/lifecycle review.
15. Staging acceptance, then production cutover approval.

After steps 5, 8, and 12, explicitly review:

- auth/default-route bypasses;
- call-end/reconnect/idempotency races;
- Durable Object SQLite data retention;
- Wrangler binding/migration correctness;
- deleted provider references and deployment wiring.

---

## 18. Definition of done

The migration is complete when:

- Cloudflare Voice is the only implementation in source;
- staging completes real browser calls through Flux → Workers AI LLM → Aura;
- one authorized Durable Object exists per interview;
- unauthorized/cross-interview/default routes cannot connect;
- communication assessment starts, completes, and records timestamps correctly;
- the normalized transcript is stored in Postgres;
- finalization and post-evaluation remain idempotent under races/retries;
- reconnects preserve context and drops do not prematurely complete;
- client status/transcript/mic UX matches existing behavior;
- ElevenLabs client, REST calls, webhook, secrets wiring, privacy copy, and docs are removed/replaced;
- `bun run check`, `bun run test`, and `bun run build` pass;
- staging browser/security/cost benchmark is documented;
- production rollback with the DO-compatible ElevenLabs artifact is proven operationally;
- Durable Object transcript erasure has an implemented, tested path.

---

## 19. Primary file checklist

### Add

- `app/features/interviews/server/voice-agent.ts`
- `app/features/interviews/server/voice-capability.ts`
- capability/route/Agent tests as described

### Edit

- `app/server.ts`
- `app/shared/env.app.ts` if minimum `SESSION_SECRET` validation must be tightened
- `app/features/interviews/server/functions.ts`
- `app/features/interviews/server/voice-assessment.ts`
- `app/features/interviews/shared/voice-runtime.ts`
- `app/features/interviews/components/voice-assessment-panel.tsx`
- `app/features/interviews/queries/queries.sql`
- `wrangler.jsonc`
- `worker-configuration.d.ts` (generated only)
- `package.json`
- `bun.lock`
- `.env.example`
- `.github/workflows/deploy.yml`
- `.github/workflows/deploy-production.yml`
- `AI-LAYER.md`
- `ARCHITECTURE.md`
- `PLATFORM.md` if needed
- `app/routes/privacy.tsx`
- account-erasure workflow/queries/tests for mandatory DO history erasure

### Delete

- `app/features/interviews/shared/voice-realtime-adapter.ts`
- `app/routes/api/voice-webhook.ts`

### Regenerate

- interview SQLC generated output via `bun run sqlgen`
- Worker binding types via `bun run cf-typegen`
- TanStack route tree via its normal generator after deleting the webhook route

### Preserve

- `finalizeVoiceAssessmentFromTranscript()` and its transaction semantics
- `startPostEvaluation()` and Workflow idempotency
- communication analysis/scoring and report blend
- terminal UI contract
- `audio_key` schema/cleanup until separately retired
- nullable legacy provider columns without new writes
