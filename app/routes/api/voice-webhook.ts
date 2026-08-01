import { createFileRoute } from "@tanstack/react-router";

import {
  getCommunicationAssessmentByProviderConversationId,
  getCommunicationAssessmentByProviderSessionId,
} from "@/features/interviews/queries/queries_sql";
import {
  finalizeVoiceAssessmentFromTranscript,
  getWebhookConversationId,
  getWebhookSessionId,
  normalizeVoiceTranscriptMessages,
  parseElevenLabsWebhookEvent,
} from "@/features/interviews/server/voice-assessment";
import { getDb } from "@/shared/db";
import { ExpectedError } from "@/shared/expected-error";

export const Route = createFileRoute("/api/voice-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let event: Awaited<ReturnType<typeof parseElevenLabsWebhookEvent>>;
        try {
          event = await parseElevenLabsWebhookEvent(request);
        } catch (error) {
          if (!(error instanceof ExpectedError)) {
            throw error;
          }
          const message = error instanceof Error ? error.message : "Invalid webhook payload";
          return new Response(message, { status: 400 });
        }

        if (event.type !== "post_call_transcription") {
          return Response.json({ received: true });
        }

        const db = getDb();
        const providerConversationId = getWebhookConversationId(event);
        const providerSessionId = getWebhookSessionId(event);

        const assessment =
          (providerConversationId
            ? await getCommunicationAssessmentByProviderConversationId(db, {
                providerConversationId,
              })
            : null) ??
          (providerSessionId
            ? await getCommunicationAssessmentByProviderSessionId(db, {
                providerSessionId,
              })
            : null);

        if (!assessment) {
          return Response.json({ received: true, matched: false });
        }

        await finalizeVoiceAssessmentFromTranscript({
          db,
          interviewId: assessment.interviewId,
          messages: normalizeVoiceTranscriptMessages(event.data.transcript),
        });

        return Response.json({ received: true, matched: true });
      },
    },
  },
});
