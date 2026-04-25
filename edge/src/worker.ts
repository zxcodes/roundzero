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
import { PostEvaluationWorkflow } from "./workflows/post-evaluation";
import { PreEvaluationWorkflow } from "./workflows/pre-evaluation";

const toInterviewType = (value: string): "full" | "quick_eval" => {
  return value === "quick_eval" ? "quick_eval" : "full";
};

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

  const state = await c.env.INTERVIEW_AGENT.getByName(interviewId).init({
    interviewId: context.id,
    applicationId: context.applicationId,
    interviewType: toInterviewType(context.type),
    jobTitle: context.jobTitle,
    companyName: context.companyName,
  });

  return c.json(state);
});

app.post("/interviews/:interviewId/refresh-context", async (c) => {
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

  const application = await db
    .unsafe(`SELECT metadata FROM applications WHERE id = $1`, [context.applicationId])
    .values();

  const metadata = application[0]?.[0];
  const candidateSummary =
    typeof metadata?.resumeText === "string"
      ? metadata.resumeText.slice(0, 2000)
      : typeof metadata?.summary === "string"
        ? metadata.summary.slice(0, 2000)
        : "";

  const requirements = await db
    .unsafe(`SELECT requirements, description, interview_questions FROM jobs WHERE id = $1`, [
      context.jobId,
    ])
    .values();

  const jobRequirements = Array.isArray(requirements[0]?.[0])
    ? (requirements[0][0] as unknown[])
        .filter((requirement): requirement is string => typeof requirement === "string")
        .map((requirement) => requirement.trim())
        .filter((requirement) => requirement.length > 0)
    : [];

  const jobDescription = typeof requirements[0]?.[1] === "string" ? requirements[0][1] : "";

  const preEvaluationRows = await db
    .unsafe(
      `SELECT score, missing_requirements, consistency_score FROM pre_evaluations WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [context.applicationId],
    )
    .values();

  const preEvaluationRow = preEvaluationRows[0];
  const preEvaluation = {
    score: typeof preEvaluationRow?.[0] === "number" ? preEvaluationRow[0] : null,
    missingRequirements: Array.isArray(preEvaluationRow?.[1])
      ? (preEvaluationRow[1] as unknown[])
          .filter((requirement): requirement is string => typeof requirement === "string")
          .map((requirement) => requirement.trim())
          .filter((requirement) => requirement.length > 0)
      : [],
    consistencyScore: typeof preEvaluationRow?.[2] === "number" ? preEvaluationRow[2] : null,
  };

  const customQuestions = Array.isArray(requirements[0]?.[2])
    ? (requirements[0][2] as unknown[]).filter(
        (question): question is string => typeof question === "string",
      )
    : [];

  const state = await c.env.INTERVIEW_AGENT.getByName(interviewId).init({
    interviewId: context.id,
    applicationId: context.applicationId,
    interviewType: toInterviewType(context.type),
    jobTitle: context.jobTitle,
    companyName: context.companyName,
    jobDescription,
    jobRequirements,
    candidateSummary,
    customQuestions,
    preEvaluation,
  });

  return c.json(state);
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

export { InterviewAgent, PostEvaluationWorkflow, PreEvaluationWorkflow };
