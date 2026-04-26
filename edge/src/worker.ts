import { routeAgentRequest } from "agents";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { InterviewAgent } from "./agents/interview-agent";
import { getInterviewContextById } from "./queries/interviews/queries_sql";
import { getDb } from "./shared/db";
import { validateEnv } from "./shared/env";
import { getInterviewAgentState } from "./shared/interview-agent-client";
import { PostEvaluationWorkflow } from "./workflows/post-evaluation";
import { PreEvaluationWorkflow } from "./workflows/pre-evaluation";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "https://roundzero.workers.dev"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.post("/pre-evaluate", async (c) => {
  const auth = c.req.header("Authorization");
  const env = validateEnv(c.env);

  if (!auth || auth !== `Bearer ${env.EDGE_WORKER_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{ applicationId: string }>();
  console.log(`[worker] Triggering pre-evaluation for application ${body.applicationId}`);
  const instance = await c.env.PRE_EVALUATION.create({
    params: { applicationId: body.applicationId },
  });

  console.log(`[worker] Workflow instance created: ${instance.id}`);
  return c.json({ instanceId: instance.id });
});

app.post("/post-evaluate", async (c) => {
  const auth = c.req.header("Authorization");
  const env = validateEnv(c.env);

  if (!auth || auth !== `Bearer ${env.EDGE_WORKER_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{ interviewId: string }>();
  console.log(`[worker] Triggering post-evaluation for interview ${body.interviewId}`);
  const instance = await c.env.POST_EVALUATION.create({
    params: { interviewId: body.interviewId },
  });

  console.log(`[worker] Post-evaluation workflow instance created: ${instance.id}`);
  return c.json({ instanceId: instance.id });
});

app.get("/internal/interviews/:interviewId/state", async (c) => {
  const auth = c.req.header("Authorization");
  const env = validateEnv(c.env);

  if (!auth || auth !== `Bearer ${env.EDGE_WORKER_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const interviewId = c.req.param("interviewId");
  const db = getDb();
  const context = await getInterviewContextById(db, { id: interviewId });
  if (!context) {
    return c.json({ error: "Interview not found" }, 404);
  }

  const state = await getInterviewAgentState(c.env, interviewId);
  return c.json(state);
});

app.get("/health", (c) => c.json({ ok: true }));

// biome-ignore lint/style/noDefaultExport: worker entrypoint
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const agentResponse = await routeAgentRequest(request, env, {
      cors: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
    if (agentResponse) {
      return agentResponse;
    }

    return await app.fetch(request, env, executionContext);
  },
};

export { InterviewAgent, PostEvaluationWorkflow, PreEvaluationWorkflow };
