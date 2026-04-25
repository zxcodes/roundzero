import { Hono } from "hono";
import { cors } from "hono/cors";
import { InterviewAgent } from "./agents/interview-agent";
import { getInterviewContextById } from "./queries/interviews/queries_sql";
import { getDb } from "./shared/db";
import { validateEnv } from "./shared/env";
import {
  addInterviewAgentMessage,
  cancelInterviewAgentSession,
  completeInterviewAgentSession,
  getInterviewAgentState,
  startInterviewAgentSession,
} from "./shared/interview-agent-client";
import { expireOverdueInterviews } from "./shared/interview-lifecycle";
import { PreEvaluationWorkflow } from "./workflows/pre-evaluation";
import { ReportGenerationWorkflow } from "./workflows/report-generation";

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

app.post("/generate-report", async (c) => {
  const auth = c.req.header("Authorization");
  const env = validateEnv(c.env);

  if (!auth || auth !== `Bearer ${env.EDGE_WORKER_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{ interviewId: string }>();
  console.log(`[worker] Triggering report generation for interview ${body.interviewId}`);
  const instance = await c.env.REPORT_GENERATION.create({
    params: { interviewId: body.interviewId },
  });

  console.log(`[worker] Report workflow instance created: ${instance.id}`);
  return c.json({ instanceId: instance.id });
});

app.post("/interviews/:interviewId/state", async (c) => {
  const auth = c.req.header("Authorization");
  const env = validateEnv(c.env);

  if (!auth || auth !== `Bearer ${env.EDGE_WORKER_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const interviewId = c.req.param("interviewId");
  const body = await c.req.json<{ candidateId: string }>();
  const db = getDb();
  const context = await getInterviewContextById(db, { id: interviewId });
  if (!context || context.candidateId !== body.candidateId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const state = await getInterviewAgentState(c.env, interviewId);
  return c.json(state);
});

app.post("/interviews/:interviewId/start", async (c) => {
  const auth = c.req.header("Authorization");
  const env = validateEnv(c.env);

  if (!auth || auth !== `Bearer ${env.EDGE_WORKER_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const interviewId = c.req.param("interviewId");
  const body = await c.req.json<{ candidateId: string }>();
  const db = getDb();
  const context = await getInterviewContextById(db, { id: interviewId });
  if (!context || context.candidateId !== body.candidateId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const state = await startInterviewAgentSession(c.env, interviewId);
  return c.json(state);
});

app.post("/interviews/:interviewId/messages", async (c) => {
  const auth = c.req.header("Authorization");
  const env = validateEnv(c.env);

  if (!auth || auth !== `Bearer ${env.EDGE_WORKER_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const interviewId = c.req.param("interviewId");
  const body = await c.req.json<{ candidateId: string; content: string }>();
  const db = getDb();
  const context = await getInterviewContextById(db, { id: interviewId });
  if (!context || context.candidateId !== body.candidateId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const state = await addInterviewAgentMessage(c.env, interviewId, body.content);
  return c.json(state);
});

app.post("/interviews/:interviewId/complete", async (c) => {
  const auth = c.req.header("Authorization");
  const env = validateEnv(c.env);

  if (!auth || auth !== `Bearer ${env.EDGE_WORKER_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const interviewId = c.req.param("interviewId");
  const body = await c.req.json<{ candidateId: string }>();
  const db = getDb();
  const context = await getInterviewContextById(db, { id: interviewId });
  if (!context || context.candidateId !== body.candidateId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const state = await completeInterviewAgentSession(c.env, interviewId);
  return c.json(state);
});

app.post("/interviews/:interviewId/cancel", async (c) => {
  const auth = c.req.header("Authorization");
  const env = validateEnv(c.env);

  if (!auth || auth !== `Bearer ${env.EDGE_WORKER_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const interviewId = c.req.param("interviewId");
  const body = await c.req.json<{ candidateId: string }>();
  const db = getDb();
  const context = await getInterviewContextById(db, { id: interviewId });
  if (!context || context.candidateId !== body.candidateId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const state = await cancelInterviewAgentSession(c.env, interviewId);
  return c.json(state);
});

app.post("/interviews/:interviewId/init", async (c) => {
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

  const state = await c.env.INTERVIEW_AGENT.get(
    c.env.INTERVIEW_AGENT.idFromName(interviewId),
  ).fetch("https://interview-agent/init", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      interviewId: context.id,
      applicationId: context.applicationId,
      interviewType: context.type,
      jobTitle: context.jobTitle,
      companyName: context.companyName,
    }),
  });

  return c.json(await state.json());
});

app.get("/health", (c) => c.json({ ok: true }));

// biome-ignore lint/style/noDefaultExport: worker entrypoint
export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    validateEnv(env);

    switch (controller.cron) {
      case "*/5 * * * *":
        ctx.waitUntil(expireOverdueInterviews(env));
        break;
      default:
        break;
    }
  },
};

export { InterviewAgent, PreEvaluationWorkflow, ReportGenerationWorkflow };
