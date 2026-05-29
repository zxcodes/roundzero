import type { PartialOptions } from "@elevenlabs/client";
import { Conversation } from "@elevenlabs/client";
import type { AnyClientTool, RealtimeMessage, RealtimeToken } from "@tanstack/ai";
import type { RealtimeAdapter, RealtimeConnection } from "@tanstack/ai-client";

/**
 * Small ElevenLabs adapter shim.
 *
 * We intentionally avoid prompt/session overrides in the browser. The only
 * unsupported pieces we still need are:
 * 1. forwarding an opaque per-session `userId` for webhook correlation
 * 2. surfacing `conversationId` so the app can register the session server-side
 */
export function voiceRealtimeAdapter(options?: {
  onConversationStarted?: (conversationId: string) => void | Promise<void>;
}): RealtimeAdapter {
  return {
    provider: "elevenlabs",
    async connect(
      token: RealtimeToken,
      clientToolDefs?: ReadonlyArray<AnyClientTool>,
    ): Promise<RealtimeConnection> {
      return createConnection(token, clientToolDefs, options);
    },
  };
}

type ProviderOptions = {
  agentId?: string;
  userId?: string;
  dynamicVariables?: Record<string, string | number | boolean>;
};

async function createConnection(
  token: RealtimeToken,
  clientToolDefs?: ReadonlyArray<AnyClientTool>,
  options?: {
    onConversationStarted?: (conversationId: string) => void | Promise<void>;
  },
): Promise<RealtimeConnection> {
  const eventHandlers = new Map<string, Set<(payload: unknown) => void>>();
  const emptyFrequency = new Uint8Array(128);
  const emptyTimeDomain = new Uint8Array(128).fill(128);
  let messageId = 0;

  const emit = (event: string, payload: unknown) => {
    const handlers = eventHandlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) handler(payload);
  };

  const nextMessageId = () => `el-msg-${Date.now()}-${++messageId}`;

  const clientTools: Record<string, (params: unknown) => Promise<string>> = {};
  if (clientToolDefs) {
    for (const tool of clientToolDefs) {
      clientTools[tool.name] = async (params) => {
        if (!tool.execute) {
          return JSON.stringify({ error: `No execute function for tool ${tool.name}` });
        }
        const result = await tool.execute(params as never);
        return typeof result === "string" ? result : JSON.stringify(result);
      };
    }
  }

  const providerOptions = (token.config?.providerOptions ?? {}) as ProviderOptions;

  const sessionOptions: PartialOptions = {
    signedUrl: token.token,
    ...(providerOptions.userId ? { userId: providerOptions.userId } : {}),
    ...(providerOptions.dynamicVariables
      ? { dynamicVariables: providerOptions.dynamicVariables }
      : {}),
    ...(Object.keys(clientTools).length > 0 ? { clientTools } : {}),
    onConnect: ({ conversationId }: { conversationId?: string }) => {
      emit("status_change", { status: "connected" });
      emit("mode_change", { mode: "listening" });
      if (conversationId && options?.onConversationStarted) {
        void options.onConversationStarted(conversationId);
      }
    },
    onDisconnect: () => {
      emit("status_change", { status: "idle" });
      emit("mode_change", { mode: "idle" });
    },
    onModeChange: ({ mode }: { mode: "speaking" | "listening" }) => {
      emit("mode_change", { mode });
    },
    onMessage: ({ message, source }: { message: string; source: "user" | "ai" }) => {
      const role = source === "user" ? "user" : "assistant";
      if (role === "user") {
        emit("transcript", { role, transcript: message, isFinal: true });
        return;
      }
      const realtimeMessage: RealtimeMessage = {
        id: nextMessageId(),
        role,
        timestamp: Date.now(),
        parts: [{ type: "audio", transcript: message }],
      };
      emit("message_complete", { message: realtimeMessage });
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Unknown voice error";
      emit("error", { error: new Error(message) });
    },
  };

  let conversation: Conversation | null = await Conversation.startSession(sessionOptions);

  const connection: RealtimeConnection = {
    async disconnect() {
      if (conversation) {
        await conversation.endSession();
        conversation = null;
      }
      emit("status_change", { status: "idle" });
    },
    async startAudioCapture() {
      emit("mode_change", { mode: "listening" });
    },
    stopAudioCapture() {
      emit("mode_change", { mode: "idle" });
    },
    sendText(text) {
      conversation?.sendUserMessage(text);
    },
    sendImage() {
      // Not supported by ElevenLabs realtime.
    },
    sendToolResult() {
      // Tool results are handled inline by the clientTools handlers.
    },
    updateSession() {
      // Session config is fixed at connection time for ElevenLabs.
    },
    interrupt() {
      emit("mode_change", { mode: "listening" });
      emit("interrupted", {});
    },
    on(event, handler) {
      let handlers = eventHandlers.get(event);
      if (!handlers) {
        handlers = new Set();
        eventHandlers.set(event, handlers);
      }
      handlers.add(handler as (payload: unknown) => void);
      return () => {
        eventHandlers.get(event)?.delete(handler as (payload: unknown) => void);
      };
    },
    getAudioVisualization() {
      return {
        get inputLevel() {
          if (!conversation) return 0;
          try {
            return conversation.getInputVolume();
          } catch {
            return 0;
          }
        },
        get outputLevel() {
          if (!conversation) return 0;
          try {
            return conversation.getOutputVolume();
          } catch {
            return 0;
          }
        },
        // ElevenLabs realtime defaults to a 16kHz audio pipeline on both
        // ends; expose it here so AudioVisualization consumers that read the
        // sample rate (e.g. waveform components) don't get NaN.
        inputSampleRate: 16_000,
        outputSampleRate: 16_000,
        getInputFrequencyData() {
          if (!conversation) return emptyFrequency;
          try {
            return conversation.getInputByteFrequencyData();
          } catch {
            return emptyFrequency;
          }
        },
        getOutputFrequencyData() {
          if (!conversation) return emptyFrequency;
          try {
            return conversation.getOutputByteFrequencyData();
          } catch {
            return emptyFrequency;
          }
        },
        getInputTimeDomainData() {
          return emptyTimeDomain;
        },
        getOutputTimeDomainData() {
          return emptyTimeDomain;
        },
      };
    },
  };

  return connection;
}
