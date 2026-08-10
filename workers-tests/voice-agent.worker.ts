import { routeAgentRequest } from "agents";

export { VoiceAssessmentAgent } from "@/features/interviews/server/voice-agent";

// oxlint-disable-next-line import/no-default-export -- Workers require the fetch handler as the default export.
export default {
  fetch(request: Request, env: Env) {
    return routeAgentRequest(request, env) ?? new Response("Not found", { status: 404 });
  },
};
