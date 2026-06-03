import { describe, expect, it, vi } from "vitest";
import {
  getTestDb,
  makeTestResumeKey,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";
import { createApplication, getApplicationById } from "../../queries/queries_sql";
import { EVAL_RETRY_AUTO_CAP, type RetryEvaluationBindings, retryEvaluation } from "../retry";

const sql = getTestDb();

// ─── Fake workflow bindings ─────────────────────────────────────────────
// Tests inject these instead of real Cloudflare Workflow bindings so we
// can assert on `create()` / `get()` / `restart()` interactions without
// the Workers runtime.

type StubInstance = {
  id: string;
  status: () => Promise<{ status: string }>;
  restart: () => Promise<void>;
};

const makeBindings = (overrides?: {
  preEvalCreate?: (args: unknown) => Promise<{ id: string }>;
  postEvalCreate?: (args: unknown) => Promise<{ id: string }>;
  postEvalGet?: (id: string) => Promise<StubInstance>;
  postEvalRestart?: () => Promise<void>;
}): RetryEvaluationBindings & {
  preCreate: ReturnType<typeof vi.fn>;
  postCreate: ReturnType<typeof vi.fn>;
  postGet: ReturnType<typeof vi.fn>;
  postRestart: ReturnType<typeof vi.fn>;
} => {
  const preCreate = vi.fn(overrides?.preEvalCreate ?? (async () => ({ id: "pre-instance-id" })));
  const postCreate = vi.fn(overrides?.postEvalCreate ?? (async () => ({ id: "post-instance-id" })));
  const postRestart = vi.fn(overrides?.postEvalRestart ?? (async () => undefined));
  const postGet = vi.fn(
    overrides?.postEvalGet ??
      (async () => {
        // Default: no retained instance — get throws.
        throw new Error("no instance");
      }),
  );

  // Fake bindings only need the methods the service touches; the type assertion
  // matches the shape of `Workflow<...>` for those methods.
  const preEvaluation = {
    create: preCreate,
  } as unknown as RetryEvaluationBindings["preEvaluation"];
  const postEvaluation = {
    create: postCreate,
    get: postGet,
  } as unknown as RetryEvaluationBindings["postEvaluation"];

  return {
    preCreate,
    postCreate,
    postGet,
    postRestart,
    preEvaluation,
    postEvaluation,
  };
};

async function seedFailedApplication(opts?: { metadata?: Record<string, unknown> }) {
  const { company } = await seedCompany();
  const candidate = await seedUser({ role: "candidate" });
  const { job } = await seedJob({ companyId: company.id, status: "open" });
  const app = await createApplication(sql, {
    jobId: job.id,
    candidateId: candidate.id,
    resumeKey: makeTestResumeKey(candidate.id),
    metadata: opts?.metadata ?? {},
    status: "evaluation_failed",
  });
  if (!app) throw new Error("seed failed");
  return { application: app, jobId: job.id, candidateId: candidate.id };
}

async function attachInterview(applicationId: string, status: string): Promise<{ id: string }> {
  const [row] = await sql`
    INSERT INTO interviews (application_id, status)
    VALUES (${applicationId}, ${status})
    RETURNING id
  `;
  return row as { id: string };
}

describe("retryEvaluation classification", () => {
  it("returns skipped when application is not in evaluation_failed", async () => {
    const { application } = await seedFailedApplication();
    await sql`UPDATE applications SET status = 'applied' WHERE id = ${application.id}`;

    const bindings = makeBindings();
    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: 3,
      source: "cron",
    });

    expect(result).toEqual({ kind: "skipped", reason: "not_evaluation_failed:applied" });
    expect(bindings.preCreate).not.toHaveBeenCalled();
    expect(bindings.postCreate).not.toHaveBeenCalled();
  });

  it("returns skipped when application does not exist", async () => {
    const bindings = makeBindings();
    const result = await retryEvaluation(sql, "00000000-0000-0000-0000-000000000000", bindings, {
      cap: 3,
      source: "cron",
    });
    expect(result).toEqual({ kind: "skipped", reason: "application_not_found" });
  });

  it("retries pre-evaluation when no interview exists", async () => {
    const { application } = await seedFailedApplication();
    const bindings = makeBindings();

    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: 3,
      source: "cron",
    });

    expect(result).toEqual({
      kind: "pre_eval",
      action: "created",
      workflowInstanceId: "pre-instance-id",
    });
    expect(bindings.preCreate).toHaveBeenCalledWith({ params: { applicationId: application.id } });

    const reloaded = await getApplicationById(sql, { id: application.id });
    expect(reloaded?.status).toBe("pre_screening");
    const metadata = reloaded?.metadata as Record<string, unknown>;
    expect(metadata.evalRetryCount).toBe(1);
    expect(metadata.evalLastRetryKind).toBe("pre_eval");
    expect(metadata.evalLastRetrySource).toBe("cron");
  });

  it("skips when interview is pending or in_progress", async () => {
    for (const status of ["pending", "in_progress"]) {
      const { application } = await seedFailedApplication();
      await attachInterview(application.id, status);
      const bindings = makeBindings();
      const result = await retryEvaluation(sql, application.id, bindings, {
        cap: 3,
        source: "cron",
      });
      expect(result).toEqual({ kind: "skipped", reason: `interview_${status}` });
      expect(bindings.preCreate).not.toHaveBeenCalled();
      expect(bindings.postCreate).not.toHaveBeenCalled();
    }
  });

  it("skips when interview is cancelled or expired", async () => {
    for (const status of ["cancelled", "expired"]) {
      const { application } = await seedFailedApplication();
      await attachInterview(application.id, status);
      const bindings = makeBindings();
      const result = await retryEvaluation(sql, application.id, bindings, {
        cap: 3,
        source: "cron",
      });
      expect(result).toEqual({ kind: "skipped", reason: `interview_${status}` });
    }
  });
});

describe("retryEvaluation post-eval probing", () => {
  it("creates a new post-eval instance when none is retained", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");
    const bindings = makeBindings();

    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: 3,
      source: "cron",
    });

    expect(result).toEqual({
      kind: "post_eval",
      action: "created",
      workflowInstanceId: "post-instance-id",
    });
    expect(bindings.postCreate).toHaveBeenCalledWith({
      id: interview.id,
      params: { interviewId: interview.id },
    });

    const reloaded = await getApplicationById(sql, { id: application.id });
    expect(reloaded?.status).toBe("interview_in_progress");
    const metadata = reloaded?.metadata as Record<string, unknown>;
    expect(metadata.evalRetryCount).toBe(1);
  });

  it("restarts an errored post-eval instance instead of creating", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");

    const restartedInstance: StubInstance = {
      id: interview.id,
      status: async () => ({ status: "errored" }),
      restart: vi.fn(async () => undefined),
    };
    const bindings = makeBindings({
      postEvalGet: async () => restartedInstance,
    });

    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: 3,
      source: "cron",
    });

    expect(result).toEqual({
      kind: "post_eval",
      action: "restarted",
      workflowInstanceId: interview.id,
    });
    expect(restartedInstance.restart).toHaveBeenCalledOnce();
    expect(bindings.postCreate).not.toHaveBeenCalled();
  });

  it("skips when post-eval is already running", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");

    const runningInstance: StubInstance = {
      id: interview.id,
      status: async () => ({ status: "running" }),
      restart: vi.fn(),
    };
    const bindings = makeBindings({
      postEvalGet: async () => runningInstance,
    });

    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: 3,
      source: "cron",
    });

    expect(result).toEqual({ kind: "skipped", reason: "post_eval_running" });
    expect(bindings.postCreate).not.toHaveBeenCalled();

    // Counter should NOT have incremented since the skip happened before the
    // claim. This is important: otherwise a cron that keeps running into a
    // healthy instance would burn the cap.
    const reloaded = await getApplicationById(sql, { id: application.id });
    expect((reloaded?.metadata as Record<string, unknown>).evalRetryCount).toBeUndefined();
    expect(reloaded?.status).toBe("evaluation_failed");
  });

  it("skips when post-eval is complete (e.g., insufficient_signal)", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");

    const completeInstance: StubInstance = {
      id: interview.id,
      status: async () => ({ status: "complete" }),
      restart: vi.fn(),
    };
    const bindings = makeBindings({
      postEvalGet: async () => completeInstance,
    });

    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: 3,
      source: "manual",
    });

    expect(result).toEqual({ kind: "skipped", reason: "post_eval_already_complete" });
  });
});

describe("retryEvaluation retry cap", () => {
  it("enforces the cap atomically — counter at or above cap blocks the claim", async () => {
    const { application } = await seedFailedApplication({
      metadata: { evalRetryCount: 3 },
    });
    const bindings = makeBindings();

    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: EVAL_RETRY_AUTO_CAP,
      source: "cron",
    });

    expect(result).toEqual({ kind: "skipped", reason: "claim_lost_or_capped" });
    expect(bindings.preCreate).not.toHaveBeenCalled();
    const reloaded = await getApplicationById(sql, { id: application.id });
    expect(reloaded?.status).toBe("evaluation_failed");
    expect((reloaded?.metadata as Record<string, unknown>).evalRetryCount).toBe(3);
  });

  it("manual retry (cap=null) ignores the counter", async () => {
    const { application } = await seedFailedApplication({
      metadata: { evalRetryCount: 99 },
    });
    const bindings = makeBindings();

    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: null,
      source: "manual",
    });

    expect(result.kind).toBe("pre_eval");
    expect(bindings.preCreate).toHaveBeenCalledOnce();
    const reloaded = await getApplicationById(sql, { id: application.id });
    expect((reloaded?.metadata as Record<string, unknown>).evalRetryCount).toBe(100);
  });
});

describe("retryEvaluation failure recovery", () => {
  it("reverts status to evaluation_failed if the workflow trigger throws", async () => {
    const { application } = await seedFailedApplication();
    const bindings = makeBindings({
      preEvalCreate: async () => {
        throw new Error("workflow runtime down");
      },
    });

    await expect(
      retryEvaluation(sql, application.id, bindings, { cap: 3, source: "cron" }),
    ).rejects.toThrow("workflow runtime down");

    // Counter stays incremented (it counts attempts), status reverts so the
    // next sweep can pick it up — until the cap is reached.
    const reloaded = await getApplicationById(sql, { id: application.id });
    expect(reloaded?.status).toBe("evaluation_failed");
    expect((reloaded?.metadata as Record<string, unknown>).evalRetryCount).toBe(1);
  });
});
