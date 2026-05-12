import { WorkersAIFluxSTT, WorkersAITTS, withVoice, type VoiceTurnContext } from "@cloudflare/voice";
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

type VoiceAssessmentStatus =
  | "idle"
  | "ready"
  | "in_call"
  | "processing"
  | "completed"
  | "skipped"
  | "error";

type VoiceAssessmentState = {
  context: VoiceAssessmentContext | null;
  status: VoiceAssessmentStatus;
  pendingAudioKey: string | null;
  errorMessage: string | null;
  updatedAt: string;
};

const toNow = () => new Date().toISOString();

const emptyState = (): VoiceAssessmentState => ({
  context: null,
  status: "idle",
  pendingAudioKey: null,
  errorMessage: null,
  updatedAt: toNow(),
});

export class VoiceAssessmentAgent extends VoiceAgent<Env> {
  // The withVoice mixin erases the custom state type, so `this.state` is `unknown`.
  // Every state access routes through `agentState` for correct typing.
  private get agentState(): VoiceAssessmentState {
    return this.state as VoiceAssessmentState;
  }

  initialState: VoiceAssessmentState = emptyState();

  // biome-ignore lint/suspicious/noExplicitAny: env.AI binding has loose typing
  transcriber = new WorkersAIFluxSTT((this.env as any).AI);
  // biome-ignore lint/suspicious/noExplicitAny: env.AI binding has loose typing
  tts = new WorkersAITTS((this.env as any).AI);

  private async hydrateContext(interviewId: string): Promise<VoiceAssessmentContext | null> {
    const db = getDb();
    const interview = await getInterviewContextById(db, { id: interviewId });
    if (!interview) {
      return null;
    }

    const metadata =
      typeof interview.metadata === "object" && interview.metadata !== null
        ? (interview.metadata as Record<string, unknown>)
        : {};
    const applicationMetadataRaw = metadata.applicationMetadata;
    const applicationMetadata =
      typeof applicationMetadataRaw === "object" && applicationMetadataRaw !== null
        ? (applicationMetadataRaw as Record<string, unknown>)
        : {};

    const candidateSummary =
      typeof applicationMetadata.candidateSummary === "string"
        ? applicationMetadata.candidateSummary
        : typeof applicationMetadata.summary === "string"
          ? applicationMetadata.summary
          : buildCandidateProfileSummary(applicationMetadata);

    const ctx: VoiceAssessmentContext = {
      interviewId: interview.id,
      applicationId: interview.applicationId,
      jobTitle: interview.jobTitle,
      companyName: interview.companyName,
      candidateName: interview.candidateName,
      candidateSummary: candidateSummary.slice(0, 8000),
    };

    return ctx;
  }

  @callable()
  async initialize(input: { interviewId: string }): Promise<{
    ok: boolean;
    status: VoiceAssessmentStatus;
    error?: string;
  }> {
    const ctx = await this.hydrateContext(input.interviewId);
    if (!ctx) {
      return { ok: false, status: "error", error: "Interview not found" };
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

    const status: VoiceAssessmentStatus =
      existing?.status === "completed"
        ? "completed"
        : existing?.status === "skipped"
          ? "skipped"
          : "ready";

    this.setState({
      context: ctx,
      status,
      pendingAudioKey: null,
      errorMessage: null,
      updatedAt: toNow(),
    });

    return { ok: true, status };
  }

  override async beforeCallStart(_connection: Connection): Promise<boolean> {
    if (this.agentState.status === "completed" || this.agentState.status === "skipped") {
      return false;
    }

    if (!this.agentState.context) {
      const interviewId = this.ctx.id.name;
      if (!interviewId) {
        return false;
      }
      const ctx = await this.hydrateContext(interviewId);
      if (!ctx) {
        return false;
      }
      this.setState({
        ...this.agentState,
        context: ctx,
        status: "in_progress",
      });
    }

    return true;
  }

  override async onCallStart(connection: Connection): Promise<void> {
    if (!this.agentState.context) {
      return;
    }
    const db = getDb();
    await markCommunicationAssessmentStarted(db, {
      interviewId: this.agentState.context.interviewId,
    });
    this.setState({
      ...this.agentState,
      status: "in_call",
      updatedAt: toNow(),
    });

    const ctx = this.agentState.context;
    await this.speak(
      connection,
      `Hi ${ctx.candidateName}! Thanks for doing this quick voice check. I'll ask you a few questions about your experience — just speak naturally.`,
    );
  }

  override async onTurn(transcript: string, onTurnContext: VoiceTurnContext) {
    const ctx = this.agentState.context;
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
      // Defer the disconnect by a microtask so the closing audio plays first.
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

  override async onCallEnd(_connection: Connection): Promise<void> {
    const ctx = this.agentState.context;
    if (!ctx) {
      return;
    }

    if (this.agentState.status === "completed") {
      return;
    }

    this.setState({
      ...this.agentState,
      status: "processing",
      updatedAt: toNow(),
    });

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

    const audioKey = this.agentState.pendingAudioKey;

    try {
      const db = getDb();
      await completeCommunicationAssessment(db, {
        interviewId: ctx.interviewId,
        transcript: transcriptForDb,
        analysis: analysis ?? this.fallbackAnalysis(transcriptForPrompt),
        audioKey,
      });
    } catch (error) {
      console.error("[voice-assessment-agent] persist failed:", error);
      this.setState({
        ...this.agentState,
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
        updatedAt: toNow(),
      });
      return;
    }

    this.setState({
      ...this.agentState,
      status: "completed",
      updatedAt: toNow(),
    });

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
      // Workflow instance may not exist yet, may already be done, or may have
      // expired its waitForEvent window. None of these are fatal — the report
      // workflow re-checks the DB on its own pass.
      console.warn("[voice-assessment-agent] signalPostEval failed:", error);
    }
  }

  @callable()
  async getStatus(): Promise<{ status: VoiceAssessmentStatus; error: string | null }> {
    return { status: this.agentState.status, error: this.agentState.errorMessage };
  }

  @callable()
  async skip(input: { interviewId: string }): Promise<{ ok: boolean }> {
    const ctx =
      this.agentState.context && this.agentState.context.interviewId === input.interviewId
        ? this.agentState.context
        : await this.hydrateContext(input.interviewId);
    if (!ctx) {
      return { ok: false };
    }

    const db = getDb();
    await markCommunicationAssessmentSkipped(db, { interviewId: ctx.interviewId });
    this.setState({
      ...this.agentState,
      context: ctx,
      status: "skipped",
      updatedAt: toNow(),
    });

    await this.signalPostEval(ctx.interviewId);
    return { ok: true };
  }
}
