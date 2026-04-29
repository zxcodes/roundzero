import { routeAgentRequest } from "agents";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { verifyInterviewAgentAccessToken } from "@/shared/interview-agent-token";
import { InterviewAgent } from "./agents/interview-agent";
import { getInterviewContextById } from "./queries/interviews/queries_sql";
import { getWorkerDb } from "./shared/db.worker";
import { validateEnv } from "./shared/env.worker";
import { getInterviewAgentState, markInterviewAgentStarted } from "./shared/interview-agent-client";
import { PostEvaluationWorkflow } from "./workflows/post-evaluation";
import { PreEvaluationWorkflow } from "./workflows/pre-evaluation";

const app = new Hono<{ Bindings: Env }>();

const preEvaluateSchema = z.object({
  applicationId: z.string().uuid(),
});

const postEvaluateSchema = z.object({
  interviewId: z.string().uuid(),
});

const interviewIdSchema = z.string().uuid();

const getInterviewTokenFromRequest = (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const directHeader = request.headers.get("X-Interview-Token");
  if (directHeader && directHeader.length > 0) {
    return directHeader;
  }

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  return queryToken && queryToken.length > 0 ? queryToken : null;
};

const isInterviewAgentRoute = (request: Request) => {
  const pathname = new URL(request.url).pathname;
  return pathname.includes("/agents/interview-agent/");
};

const verifyInterviewAgentRequest = async (request: Request, env: Env, interviewId: string) => {
  if (request.method === "OPTIONS") {
    return null;
  }

  const parsedInterviewId = interviewIdSchema.safeParse(interviewId);
  if (!parsedInterviewId.success) {
    return new Response("Invalid interview id", { status: 400 });
  }

  const token = getInterviewTokenFromRequest(request);
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const validatedEnv = validateEnv(env);
  const verification = await verifyInterviewAgentAccessToken({
    token,
    interviewId: parsedInterviewId.data,
    secret: validatedEnv.EDGE_WORKER_SECRET,
  });

  if (!verification) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getWorkerDb();
  const interview = await getInterviewContextById(db, { id: parsedInterviewId.data });
  if (!interview) {
    return new Response("Interview not found", { status: 404 });
  }

  if (interview.candidateId !== verification.candidateId) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
};

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

  const payload = await c.req.json<unknown>();
  const body = preEvaluateSchema.safeParse(payload);
  if (!body.success) {
    return c.json({ error: "Invalid request payload" }, 400);
  }

  console.log(`[worker] Triggering pre-evaluation for application ${body.data.applicationId}`);
  const instance = await c.env.PRE_EVALUATION.create({
    params: { applicationId: body.data.applicationId },
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

  const payload = await c.req.json<unknown>();
  const body = postEvaluateSchema.safeParse(payload);
  if (!body.success) {
    return c.json({ error: "Invalid request payload" }, 400);
  }

  console.log(`[worker] Triggering post-evaluation for interview ${body.data.interviewId}`);
  const instance = await c.env.POST_EVALUATION.create({
    params: { interviewId: body.data.interviewId },
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
  const parsedInterviewId = interviewIdSchema.safeParse(interviewId);
  if (!parsedInterviewId.success) {
    return c.json({ error: "Invalid interview id" }, 400);
  }

  const db = getWorkerDb();
  const context = await getInterviewContextById(db, { id: parsedInterviewId.data });
  if (!context) {
    return c.json({ error: "Interview not found" }, 404);
  }

  const state = await getInterviewAgentState(c.env, parsedInterviewId.data);
  return c.json(state);
});

app.post("/internal/interviews/:interviewId/start", async (c) => {
  const auth = c.req.header("Authorization");
  const env = validateEnv(c.env);

  if (!auth || auth !== `Bearer ${env.EDGE_WORKER_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const interviewId = c.req.param("interviewId");
  const parsedInterviewId = interviewIdSchema.safeParse(interviewId);
  if (!parsedInterviewId.success) {
    return c.json({ error: "Invalid interview id" }, 400);
  }

  const db = getWorkerDb();
  const context = await getInterviewContextById(db, { id: parsedInterviewId.data });
  if (!context) {
    return c.json({ error: "Interview not found" }, 404);
  }

  const result = await markInterviewAgentStarted(c.env, parsedInterviewId.data);
  return c.json(result);
});

app.get("/health", (c) => c.json({ ok: true }));

// biome-ignore lint/style/noDefaultExport: worker entrypoint
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const validatedEnv = validateEnv(env);

    const agentResponse = await routeAgentRequest(request, env, {
      cors: {
        "Access-Control-Allow-Origin": validatedEnv.APP_URL,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      onBeforeConnect: async (req, lobby) => {
        if (!isInterviewAgentRoute(req)) {
          return req;
        }

        const authError = await verifyInterviewAgentRequest(req, env, lobby.name);
        if (authError) {
          return authError;
        }

        return req;
      },
      onBeforeRequest: async (req, lobby) => {
        if (!isInterviewAgentRoute(req)) {
          return req;
        }

        const authError = await verifyInterviewAgentRequest(req, env, lobby.name);
        if (authError) {
          return authError;
        }

        return req;
      },
    });
    if (agentResponse) {
      return agentResponse;
    }

    return await app.fetch(request, env, executionContext);
  },
};

export { InterviewAgent, PostEvaluationWorkflow, PreEvaluationWorkflow };
