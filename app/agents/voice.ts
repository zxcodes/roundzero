import {
  type VoiceTurnContext,
  WorkersAIFluxSTT,
  WorkersAITTS,
  withVoice,
} from "@cloudflare/voice";
import { Agent, type Connection, callable } from "agents";
import { generateObject, streamText } from "ai";
import {
  completeCommunicationAssessment,
  createCommunicationAssessment,
  getCommunicationAssessmentByInterviewId,
  getInterviewContextById,
  markCommunicationAssessmentSkipped,
  markCommunicationAssessmentStarted,
} from "@/features/interviews/queries/queries_sql";
import {
  buildCommunicationAnalysisPrompt,
  type CommunicationAssessmentAnalysis,
  communicationAssessmentSchema,
} from "@/prompts/communication-assessment";
import { buildVoiceAssessmentSystemPrompt } from "@/prompts/voice-assessment";
import { buildCandidateProfileSummary } from "@/shared/ai-candidate-profile";
import { getDb } from "@/shared/db";
import { getModelChain, getOpenRouter } from "@/shared/openrouter";

const VoiceAgent = withVoice(Agent, { audioFormat: "mp3", historyLimit: 30 });

const END_CALL_MARKER = "##END_CALL##";

type VoiceAssessmentContext = {
  interviewId: string;
  applicationId: string;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  candidateSummary: string;
};

export type VoiceAssessmentStatus = "pending" | "in_call" | "completed" | "skipped" | "error";

export type VoiceAssessmentState = {
  status: VoiceAssessmentStatus;
  // Set true right before an intentional end (agent emitted ##END_CALL##, or
  // candidate clicked End). Drives onCallEnd's decision to finalize vs treat
  // as a transient WS drop.
  intentionalEnd: boolean;
  startedAt: string | null;
  errorMessage: string | null;
  updatedAt: string;
};

const toNow = () => new Date().toISOString();

export class VoiceAssessmentAgent extends VoiceAgent<Env> {
  // The withVoice mixin erases the typed state, so route every read through
  // this getter. `setState` keeps writing the same shape via `updateState`.
  private get s(): VoiceAssessmentState {
    return this.state as VoiceAssessmentState;
  }

  initialState: VoiceAssessmentState = {
    status: "pending",
    intentionalEnd: false,
    startedAt: null,
    errorMessage: null,
    updatedAt: toNow(),
  };

  // biome-ignore lint/suspicious/noExplicitAny: env.AI binding has loose typing
  transcriber = new WorkersAIFluxSTT((this.env as any).AI);
  // biome-ignore lint/suspicious/noExplicitAny: env.AI binding has loose typing
  tts = new WorkersAITTS((this.env as any).AI);

  // Per-process cached interview context. Cheaper than re-querying every turn,
  // and harmless if lost on hibernation (re-loaded on next access).
  private _context: VoiceAssessmentContext | null = null;

  private updateState(patch: Partial<VoiceAssessmentState>) {
    this.setState({ ...this.s, ...patch, updatedAt: toNow() });
  }

  private async loadContext(): Promise<VoiceAssessmentContext | null> {
    if (this._context) return this._context;

    const interviewId = this.name;
    if (!interviewId) return null;

    const db = getDb();
    const interview = await getInterviewContextById(db, { id: interviewId });
    if (!interview) return null;

    // applications.metadata holds the candidate summary fields populated by
    // pre-eval — same source InterviewAgent.hydrateContextFromDb() reads.
    const applicationRows = await db
      .unsafe(`SELECT a.metadata FROM applications a WHERE a.id = $1`, [interview.applicationId])
      .values();

    const applicationMetadata =
      typeof applicationRows[0]?.[0] === "object" && applicationRows[0][0] !== null
        ? (applicationRows[0][0] as Record<string, unknown>)
        : {};

    const candidateSummaryRaw =
      typeof applicationMetadata.resumeText === "string"
        ? applicationMetadata.resumeText
        : typeof applicationMetadata.summary === "string"
          ? applicationMetadata.summary
          : buildCandidateProfileSummary(applicationMetadata);

    const ctx: VoiceAssessmentContext = {
      interviewId: interview.id,
      applicationId: interview.applicationId,
      jobTitle: interview.jobTitle,
      companyName: interview.companyName,
      candidateName: interview.candidateName,
      candidateSummary: candidateSummaryRaw.slice(0, 8000),
    };

    this._context = ctx;
    return ctx;
  }

  /**
   * Called once when the candidate's panel mounts. Idempotent — creates the
   * DB row if missing and rehydrates this DO's state from whatever the DB
   * thinks the latest status is (so a fresh DO restart doesn't show "pending"
   * for a row that's already "completed").
   */
  @callable()
  async initialize(): Promise<{ ok: true; status: VoiceAssessmentStatus }> {
    const ctx = await this.loadContext();
    if (!ctx) {
      this.updateState({ status: "error", errorMessage: "Interview not found" });
      return { ok: true, status: "error" };
    }

    const db = getDb();
    const existing = await getCommunicationAssessmentByInterviewId(db, {
      interviewId: ctx.interviewId,
    });

    if (!existing) {
      await createCommunicationAssessment(db, {
        interviewId: ctx.interviewId,
        applicationId: ctx.applicationId,
        status: "pending",
      });
    }

    const dbStatus: VoiceAssessmentStatus =
      existing?.status === "completed"
        ? "completed"
        : existing?.status === "skipped"
          ? "skipped"
          : existing?.status === "in_progress"
            ? "in_call"
            : "pending";

    if (this.s.status !== dbStatus) {
      this.updateState({ status: dbStatus });
    }

    return { ok: true, status: dbStatus };
  }

  override async onCallStart(connection: Connection): Promise<void> {
    const ctx = await this.loadContext();
    if (!ctx) return;

    // Never restart a call that was already completed or skipped.
    if (this.s.status === "completed" || this.s.status === "skipped") {
      return;
    }

    // If state is already "in_call" (e.g. resuming after a refresh), skip the
    // greeting — the conversation history is preserved by the voice mixin's
    // SQLite, so the model just continues. Only greet on the first connect.
    const isResuming = this.s.status === "in_call";

    if (!isResuming) {
      const db = getDb();
      await markCommunicationAssessmentStarted(db, { interviewId: ctx.interviewId });
      this.updateState({
        status: "in_call",
        intentionalEnd: false,
        startedAt: toNow(),
        errorMessage: null,
      });
      await this.speak(
        connection,
        `Hi ${ctx.candidateName}! Thanks for staying for this short voice check. I'll ask a few quick questions about your experience — speak as naturally as you would on a real call.`,
      );
    } else {
      // Reset the intent flag so a fresh end-of-call decision can happen.
      this.updateState({ intentionalEnd: false });
    }
  }

  override async onTurn(transcript: string, onTurnContext: VoiceTurnContext) {
    const ctx = await this.loadContext();
    if (!ctx) {
      return "I'm sorry — your session isn't ready. Please end the call and try again.";
    }

    const openrouter = getOpenRouter();
    const { model, fallbacks } = getModelChain("voice");

    const systemPrompt = buildVoiceAssessmentSystemPrompt({
      jobTitle: ctx.jobTitle,
      companyName: ctx.companyName,
      candidateName: ctx.candidateName,
      candidateSummary: ctx.candidateSummary,
    });

    try {
      const result = streamText({
        model: openrouter.chat(model),
        temperature: 0.5,
        maxOutputTokens: 200,
        system: systemPrompt,
        abortSignal: onTurnContext.signal,
        messages: [
          ...onTurnContext.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: transcript },
        ],
        ...(fallbacks.length > 0 ? { providerOptions: { openrouter: { models: fallbacks } } } : {}),
      });

      return result.textStream;
    } catch (error) {
      console.error("[voice-assessment-agent] streamText failed:", error);
      return "Sorry, could you say that again?";
    }
  }

  override afterSynthesize(
    audio: ArrayBuffer | null,
    text: string,
    connection: Connection,
  ): ArrayBuffer | null {
    if (text.includes(END_CALL_MARKER)) {
      // Mark intent BEFORE forceEndCall so onCallEnd can finalize.
      this.updateState({ intentionalEnd: true });
      // Defer forceEndCall by a microtask so the closing sentence audio plays
      // before we cut the connection.
      queueMicrotask(() => {
        try {
          this.forceEndCall(connection);
        } catch (error) {
          console.error("[voice-assessment-agent] forceEndCall failed:", error);
        }
      });
    }
    return audio;
  }

  /**
   * Called by the candidate's UI right before `voice.endCall()` to flag this
   * disconnect as intentional, so onCallEnd finalizes the assessment instead
   * of treating it as a transient drop.
   */
  @callable()
  async markEndIntent(): Promise<{ ok: true }> {
    if (this.s.status === "in_call") {
      this.updateState({ intentionalEnd: true });
    }
    return { ok: true };
  }

  override async onCallEnd(_connection: Connection): Promise<void> {
    const ctx = await this.loadContext();
    if (!ctx) return;

    if (this.s.status === "completed" || this.s.status === "skipped") return;

    if (!this.s.intentionalEnd) {
      // Transient drop (refresh, network blip). Leave state "in_call" so the
      // candidate can reconnect and resume. The voice mixin persists the
      // transcript in SQLite; conversation continues on next startCall(). The
      // post-eval workflow's 12h window is the eventual safety net.
      console.info(
        "[voice-assessment-agent] connection dropped without end intent; staying in_call for reconnect",
      );
      return;
    }

    await this.finalize(ctx);
  }

  private async finalize(ctx: VoiceAssessmentContext): Promise<void> {
    const history = this.getConversationHistory(200);
    const transcriptForPrompt = history
      .map((m) => `${m.role === "assistant" ? "Zero" : ctx.candidateName}: ${m.content}`)
      .join("\n")
      .replaceAll(END_CALL_MARKER, "")
      .trim();

    const transcriptForDb = history.map((m) => ({
      role: m.role,
      content: m.content.replaceAll(END_CALL_MARKER, "").trim(),
    }));

    let analysis: CommunicationAssessmentAnalysis | null = null;
    if (transcriptForPrompt.length > 0) {
      analysis = await this.runAnalysis(transcriptForPrompt, ctx);
    }

    try {
      const db = getDb();
      await completeCommunicationAssessment(db, {
        interviewId: ctx.interviewId,
        transcript: transcriptForDb,
        analysis: analysis ?? this.fallbackAnalysis(transcriptForPrompt),
        audioKey: null,
      });
    } catch (error) {
      console.error("[voice-assessment-agent] persist failed:", error);
      this.updateState({
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    this.updateState({ status: "completed", intentionalEnd: false });
    await this.signalPostEval(ctx.interviewId);
  }

  private async runAnalysis(
    transcript: string,
    ctx: VoiceAssessmentContext,
  ): Promise<CommunicationAssessmentAnalysis | null> {
    const openrouter = getOpenRouter();
    const { model, fallbacks } = getModelChain("post_eval");
    const { systemPrompt, userPrompt } = buildCommunicationAnalysisPrompt({
      jobTitle: ctx.jobTitle,
      companyName: ctx.companyName,
      candidateName: ctx.candidateName,
      transcript,
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await generateObject({
          model: openrouter.chat(model, { plugins: [{ id: "response-healing" }] }),
          schema: communicationAssessmentSchema,
          system: systemPrompt,
          prompt: userPrompt,
          ...(fallbacks.length > 0
            ? { providerOptions: { openrouter: { models: fallbacks } } }
            : {}),
        });
        return result.object;
      } catch (error) {
        console.error(`[voice-assessment-agent] analysis attempt ${attempt + 1} failed:`, error);
      }
    }
    return null;
  }

  private fallbackAnalysis(transcript: string): CommunicationAssessmentAnalysis {
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    const baseline = wordCount === 0 ? 50 : Math.min(70, 40 + Math.floor(wordCount / 25));
    const dim = (note: string) => ({ score: baseline, evidence: [note] });
    return {
      clarity: dim("Heuristic fallback: structured-output analysis was unavailable."),
      articulation: dim("Heuristic fallback: structured-output analysis was unavailable."),
      conciseness: dim("Heuristic fallback: structured-output analysis was unavailable."),
      listening: dim("Heuristic fallback: structured-output analysis was unavailable."),
      confidence: dim("Heuristic fallback: structured-output analysis was unavailable."),
      overallScore: baseline,
      summary:
        "Communication analysis fell back to heuristic scoring after the structured analysis call failed. Treat these scores as low-confidence and review the transcript directly.",
    };
  }

  private async signalPostEval(interviewId: string): Promise<void> {
    try {
      const instance = await this.env.POST_EVALUATION.get(interviewId);
      await instance.sendEvent({
        type: "voice_assessment_complete",
        payload: { interviewId },
      });
    } catch (error) {
      // Workflow instance may not exist (test/dev) or may have already moved
      // past its waitForEvent window. Both are non-fatal — the workflow
      // re-checks the DB on its own pass anyway.
      console.warn("[voice-assessment-agent] signalPostEval failed:", error);
    }
  }

  @callable()
  async skip(): Promise<{ ok: true }> {
    const ctx = await this.loadContext();
    if (!ctx) return { ok: true };

    if (this.s.status === "completed" || this.s.status === "skipped") return { ok: true };

    const db = getDb();
    await markCommunicationAssessmentSkipped(db, { interviewId: ctx.interviewId });
    this.updateState({ status: "skipped" });
    await this.signalPostEval(ctx.interviewId);
    return { ok: true };
  }
}
