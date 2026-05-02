import handler from "@tanstack/react-start/server-entry";
import { routeAgentRequest } from "agents";

export { InterviewAgent } from "./agents/interview";
export { PostEvaluationWorkflow } from "./workflows/post-evaluation";
export { PreEvaluationWorkflow } from "./workflows/pre-evaluation";

// biome-ignore lint/style/noDefaultExport: worker entrypoint
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    return (handler.fetch as (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response>)(
      request,
      env,
      ctx,
    );
  },
};
