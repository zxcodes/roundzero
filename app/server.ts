import handler from "@tanstack/react-start/server-entry";

export { InterviewAgent } from "./agents/interview-agent";
export { PostEvaluationWorkflow } from "./workflows/post-evaluation";
export { PreEvaluationWorkflow } from "./workflows/pre-evaluation";

// biome-ignore lint/style/noDefaultExport: worker entrypoint
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return (handler.fetch as (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response>)(
      request,
      env,
      ctx,
    );
  },
};
