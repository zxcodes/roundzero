import { Hono } from "hono";
import { cors } from "hono/cors";
import { InterviewAgent } from "./agents/interview-agent";
import { validateEnv } from "./shared/env";
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

app.get("/health", (c) => c.json({ ok: true }));

// biome-ignore lint/style/noDefaultExport: worker entrypoint
export default {
  fetch: app.fetch,
};

export { InterviewAgent, PreEvaluationWorkflow, ReportGenerationWorkflow };
