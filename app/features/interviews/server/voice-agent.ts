import {
  withVoice,
  WorkersAIFluxSTT,
  WorkersAITTS,
  type VoiceTurnContext,
} from "@cloudflare/voice";
import { Agent, type Connection, type ConnectionContext, type WSMessage } from "agents";
import { isStepCount, streamText } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { z } from "zod";

import { getInterviewContextById } from "@/features/interviews/queries/queries_sql";
import {
  finalizeVoiceAssessmentFromTranscript,
  startVoiceAssessmentCall,
  type VoiceFinalizationResult,
} from "@/features/interviews/server/voice-assessment";
import {
  buildVoiceAssessmentFirstMessage,
  buildVoiceAssessmentSystemPrompt,
  buildVoiceModelMessages,
  loadVoiceAssessmentContext,
  type VoiceAssessmentContext,
} from "@/features/interviews/shared/voice-runtime";
import { getDb } from "@/shared/db";

const VoiceAgentBase = withVoice(Agent, {
  historyLimit: 40,
  maxMessageCount: 500,
  audioFormat: "mp3",
});

const INTERVIEW_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_CALL_DURATION_MS = 10 * 60 * 1000;
const VOICE_HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const VOICE_HISTORY_PURGE_PAYLOAD = { version: 1 } as const;

const endCallInputSchema = z
  .object({
    message: z.string().trim().min(1).max(240),
    reason: z.string().trim().min(1).max(120),
  })
  .strict();

const requestVoiceHistorySchema = z.object({ type: z.literal("request_voice_history") }).strict();

type EndCallInput = z.infer<typeof endCallInputSchema>;

function sendCustomMessage(connection: Connection, message: Record<string, unknown>) {
  connection.send(JSON.stringify(message));
}

export class VoiceAssessmentAgent extends VoiceAgentBase<Env> {
  static options = { sendIdentityOnConnect: false };

  transcriber = new WorkersAIFluxSTT(this.env.AI, { eotTimeoutMs: 5_000 });
  tts = new WorkersAITTS(this.env.AI, {
    model: "@cf/deepgram/aura-1",
    speaker: "asteria",
  });

  private activeSpeakerId: string | null = null;
  private callAttempts = new Map<string, string>();
  private callDurationTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private completedConnections = new Set<string>();
  private voiceContext: VoiceAssessmentContext | null = null;

  onConnect(connection: Connection, context: ConnectionContext) {
    const url = new URL(context.request.url);
    const expectedPath = `/agents/voice-assessment-agent/${this.name}`;
    if (!INTERVIEW_ID_RE.test(this.name) || url.pathname !== expectedPath) {
      connection.close(1008, "Unauthorized");
      return;
    }
  }

  onClose(connection: Connection) {
    this.callAttempts.delete(connection.id);
    this.completedConnections.delete(connection.id);
    this.clearCallDurationTimer(connection.id);
    this.releaseActiveSpeaker(connection.id);
  }

  onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== "string") return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (!requestVoiceHistorySchema.safeParse(parsed).success) return;

    sendCustomMessage(connection, {
      type: "voice_history",
      messages: this.getConversationHistory(200).map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
    });
  }

  async beforeCallStart(connection: Connection) {
    if (
      this.activeSpeakerId &&
      this.activeSpeakerId !== connection.id &&
      [...this.getConnections()].some((current) => current.id === this.activeSpeakerId)
    ) {
      return false;
    }

    this.activeSpeakerId = connection.id;
    try {
      const db = getDb();
      const interview = await startVoiceAssessmentCall(db, this.name);
      if (!interview) {
        this.releaseActiveSpeaker(connection.id);
        return false;
      }

      this.voiceContext = await loadVoiceAssessmentContext(db, interview);
      await this.ensureHistoryPurgeSchedule(true);
      return true;
    } catch (error) {
      this.releaseActiveSpeaker(connection.id);
      throw error;
    }
  }

  async onCallStart(connection: Connection) {
    const callAttemptId = crypto.randomUUID();
    this.callAttempts.set(connection.id, callAttemptId);
    this.completedConnections.delete(connection.id);

    try {
      if (!this.voiceContext) throw new Error("Voice assessment context was not prepared");
      this.startCallDurationTimer(connection);

      if (this.getConversationHistory(1).length === 0) {
        await this.speak(connection, buildVoiceAssessmentFirstMessage(this.voiceContext));
      }
    } catch (error) {
      this.callAttempts.delete(connection.id);
      this.clearCallDurationTimer(connection.id);
      this.releaseActiveSpeaker(connection.id);
      this.forceEndCall(connection);
      console.error(
        JSON.stringify({
          message: "voice call initialization failed",
          error: error instanceof Error ? error.message : "unknown error",
        }),
      );
      throw new Error("Voice call could not start");
    }
  }

  afterTranscribe(transcript: string, connection: Connection) {
    if (this.completedConnections.has(connection.id)) return null;

    const normalized = transcript.replace(/\s+/gu, " ").trim();
    if (!normalized || !/[\p{L}\p{N}]/u.test(normalized)) return null;
    return normalized;
  }

  async onTurn(_transcript: string, context: VoiceTurnContext) {
    const voiceContext = await this.loadCurrentVoiceContext();
    const workersai = createWorkersAI({ binding: this.env.AI });
    const result = streamText({
      model: workersai("@cf/openai/gpt-oss-20b", {
        sessionAffinity: this.sessionAffinity,
        reasoning_effort: "low",
      }),
      system: buildVoiceAssessmentSystemPrompt(voiceContext),
      messages: buildVoiceModelMessages(context.messages),
      tools: {
        end_call: {
          description:
            "End the voice assessment. The message is the only spoken closing and the reason is an internal completion note.",
          inputSchema: endCallInputSchema,
        },
      },
      stopWhen: isStepCount(1),
      abortSignal: context.signal,
      temperature: 0.3,
      maxOutputTokens: 140,
    });

    const connection = context.connection;
    const completedConnections = this.completedConnections;
    const clearCallDurationTimer = () => this.clearCallDurationTimer(connection.id);

    async function* voiceResponse() {
      let endCall: EndCallInput | null = null;

      try {
        for await (const part of result.fullStream) {
          if (part.type === "tool-call" && part.toolName === "end_call") {
            const parsed = endCallInputSchema.safeParse(part.input);
            if (parsed.success) {
              endCall = parsed.data;
            }
            continue;
          }

          if (endCall && part.type === "text-delta") continue;
          if (part.type === "error") {
            yield { type: "error", error: new Error("Voice response generation failed") };
            return;
          }
          yield part;
        }
      } catch {
        yield { type: "error", error: new Error("Voice response generation failed") };
        return;
      }

      if (!endCall || completedConnections.has(connection.id)) return;

      clearCallDurationTimer();
      completedConnections.add(connection.id);
      yield { type: "text-delta", text: endCall.message };
      sendCustomMessage(connection, {
        type: "assessment_complete",
        reason: "agent_complete",
      });
    }

    return voiceResponse();
  }

  async finalizeCommittedHistory(): Promise<VoiceFinalizationResult> {
    try {
      const messages = this.getConversationHistory(500).reduce<
        Array<{ role: "assistant" | "candidate"; content: string }>
      >((normalized, message) => {
        const content = message.content.trim();
        if (!content) return normalized;
        normalized.push({
          role: message.role === "assistant" ? "assistant" : "candidate",
          content,
        });
        return normalized;
      }, []);

      await this.ensureHistoryPurgeSchedule(false);
      return await finalizeVoiceAssessmentFromTranscript({
        db: getDb(),
        interviewId: this.name,
        messages,
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "voice assessment finalization failed",
          error: error instanceof Error ? error.message : "unknown error",
        }),
      );
      return { ok: false, reason: "retryable_failure" };
    }
  }

  onCallEnd(connection: Connection) {
    const callAttemptId = this.callAttempts.get(connection.id);
    this.callAttempts.delete(connection.id);
    this.completedConnections.delete(connection.id);
    this.clearCallDurationTimer(connection.id);
    this.releaseActiveSpeaker(connection.id);
    if (!callAttemptId) return;

    return this.keepAliveWhile(async () => {
      await this.finalizeCommittedHistory();
    });
  }

  async purgeConversationHistory(payload: unknown) {
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("version" in payload) ||
      payload.version !== VOICE_HISTORY_PURGE_PAYLOAD.version
    ) {
      return;
    }

    this.deleteConversationHistory();
    void this.sql`DELETE FROM rz_voice_metadata WHERE key = 'history_purge_at'`;
  }

  async eraseConversationHistory() {
    const schedules = await this.listSchedules();
    const purgeSchedules = schedules.filter(
      (schedule) => schedule.callback === "purgeConversationHistory",
    );
    for (const schedule of purgeSchedules) {
      await this.cancelSchedule(schedule.id);
    }

    this.deleteConversationHistory();
    void this.sql`DELETE FROM rz_voice_metadata`;
    this.voiceContext = null;
  }

  private async loadCurrentVoiceContext() {
    if (this.voiceContext) return this.voiceContext;

    const db = getDb();
    const interview = await getInterviewContextById(db, { id: this.name });
    if (!interview) throw new Error("Voice interview was not found");
    this.voiceContext = await loadVoiceAssessmentContext(db, interview);
    return this.voiceContext;
  }

  private ensureMetadataSchema() {
    void this.sql`
      CREATE TABLE IF NOT EXISTS rz_voice_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `;
  }

  private async ensureHistoryPurgeSchedule(createIfMissing: boolean) {
    this.ensureMetadataSchema();
    let [storedDeadline] = this.sql<{ value: string }>`
      SELECT value FROM rz_voice_metadata WHERE key = 'history_purge_at'
    `;

    if (!storedDeadline && createIfMissing) {
      const deadline = Date.now() + VOICE_HISTORY_RETENTION_MS;
      void this.sql`
        INSERT OR IGNORE INTO rz_voice_metadata (key, value)
        VALUES ('history_purge_at', ${String(deadline)})
      `;
      [storedDeadline] = this.sql<{ value: string }>`
        SELECT value FROM rz_voice_metadata WHERE key = 'history_purge_at'
      `;
    }
    if (!storedDeadline) return;

    const deadline = Number(storedDeadline.value);
    if (!Number.isFinite(deadline)) {
      throw new Error("Voice history retention deadline is invalid");
    }

    await this.schedule(
      new Date(deadline),
      "purgeConversationHistory",
      VOICE_HISTORY_PURGE_PAYLOAD,
      { idempotent: true },
    );
  }

  private deleteConversationHistory() {
    this.getConversationHistory(1);
    void this.sql`DELETE FROM cf_voice_messages`;
  }

  private startCallDurationTimer(connection: Connection) {
    this.clearCallDurationTimer(connection.id);
    const timer = setTimeout(() => {
      void this.keepAliveWhile(async () => {
        await this.handleCallDurationLimit(connection);
      });
    }, MAX_CALL_DURATION_MS);
    this.callDurationTimers.set(connection.id, timer);
  }

  private clearCallDurationTimer(connectionId: string) {
    const timer = this.callDurationTimers.get(connectionId);
    if (timer) clearTimeout(timer);
    this.callDurationTimers.delete(connectionId);
  }

  private releaseActiveSpeaker(connectionId: string) {
    if (this.activeSpeakerId === connectionId) {
      this.activeSpeakerId = null;
    }
  }

  private async handleCallDurationLimit(connection: Connection) {
    if (this.completedConnections.has(connection.id)) {
      this.clearCallDurationTimer(connection.id);
      return;
    }

    const callAttemptId = this.callAttempts.get(connection.id);
    this.clearCallDurationTimer(connection.id);
    if (!callAttemptId) return;

    this.completedConnections.add(connection.id);
    const candidateName = this.voiceContext?.candidateName || "there";
    const message = `Thanks for your time, ${candidateName} — that's all I need for this communication check.`;
    await this.speak(connection, message);
    sendCustomMessage(connection, {
      type: "assessment_complete",
      reason: "duration_limit",
    });
  }
}
