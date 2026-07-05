import { describe, expect, it, vi } from "vitest";
import {
  getTestDb,
  makeTestResumeKey,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";
import { createApplication, getApplicationById } from "../../queries/queries_sql";
import {
  EVAL_RETRY_AUTO_CAP,
  previewEvaluationRetry,
  type RetryEvaluationBindings,
  retryEvaluation,
} from "../retry";

const sql = getTestDb();

// ─── Fake workflow bindings ─────────────────────────────────────────────
// Tests inject these instead of real Cloudflare Workflow bindings so we
// can assert on `create()` / `get()` / `restart()` interactions without
// the Workers runtime.

type StubInstance = {
  id: string;
  status: () => Promise<{ status: string; output?: unknown }>;
  restart: (options?: { from?: { name: string } }) => Promise<void>;
  disposed?: boolean;
  [Symbol.dispose]?: () => void;
};

const makeStubInstance = (input: {
  id: string;
  status: () => Promise<{ status: string; output?: unknown }>;
  restart?: (options?: { from?: { name: string } }) => Promise<void>;
}): StubInstance => {
  const instance: StubInstance = {
    id: input.id,
    status: input.status,
    restart: input.restart ?? vi.fn(async () => undefined),
    disposed: false,
  };
  instance[Symbol.dispose] = () => {
    instance.disposed = true;
  };
  return instance;
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

    const restartedInstance = makeStubInstance({
      id: interview.id,
      status: async () => ({ status: "errored" }),
      restart: vi.fn(async () => undefined),
    });
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
    expect(restartedInstance.disposed).toBe(true);
    expect(bindings.postCreate).not.toHaveBeenCalled();
  });

  it("skips when post-eval is already running", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");

    const runningInstance = makeStubInstance({
      id: interview.id,
      status: async () => ({ status: "running" }),
    });
    const bindings = makeBindings({
      postEvalGet: async () => runningInstance,
    });

    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: 3,
      source: "cron",
    });

    expect(result).toEqual({ kind: "skipped", reason: "post_eval_running" });
    expect(runningInstance.disposed).toBe(true);
    expect(bindings.postCreate).not.toHaveBeenCalled();

    // Counter should NOT have incremented since the skip happened before the
    // claim. This is important: otherwise a cron that keeps running into a
    // healthy instance would burn the cap.
    const reloaded = await getApplicationById(sql, { id: application.id });
    expect((reloaded?.metadata as Record<string, unknown>).evalRetryCount).toBeUndefined();
    expect(reloaded?.status).toBe("evaluation_failed");
  });

  it("skips when post-eval is complete with insufficient_signal", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");

    const completeInstance = makeStubInstance({
      id: interview.id,
      status: async () => ({
        status: "complete",
        output: { status: "insufficient_signal" },
      }),
    });
    const bindings = makeBindings({
      postEvalGet: async () => completeInstance,
    });

    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: 3,
      source: "manual",
    });

    expect(result).toEqual({ kind: "skipped", reason: "post_eval_already_complete" });
    expect(completeInstance.disposed).toBe(true);
  });

  it("restarts from load_voice_assessment when post-eval completed without voice analysis", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");

    await sql`
      INSERT INTO communication_assessments (interview_id, application_id, status, transcript, analysis)
      VALUES (
        ${interview.id},
        ${application.id},
        'completed',
        ${JSON.stringify([{ role: "candidate", content: "I led the migration project end to end." }])}::jsonb,
        NULL
      )
    `;

    const restartedInstance = makeStubInstance({
      id: interview.id,
      status: async () => ({
        status: "complete",
        output: { status: "voice_assessment_incomplete" },
      }),
      restart: vi.fn(async () => undefined),
    });
    const bindings = makeBindings({
      postEvalGet: async () => restartedInstance,
    });

    const result = await retryEvaluation(sql, application.id, bindings, {
      cap: 3,
      source: "manual",
    });

    expect(result).toEqual({
      kind: "post_eval",
      action: "restarted",
      workflowInstanceId: interview.id,
    });
    expect(restartedInstance.restart).toHaveBeenCalledWith({
      from: { name: "load_voice_assessment" },
    });
    expect(restartedInstance.disposed).toBe(true);
    expect(bindings.postCreate).not.toHaveBeenCalled();
  });

  it("disposes the instance when status() throws", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");

    const brokenInstance = makeStubInstance({
      id: interview.id,
      status: async () => {
        throw new Error("status unavailable");
      },
    });
    const bindings = makeBindings({
      postEvalGet: async () => brokenInstance,
    });

    await expect(
      retryEvaluation(sql, application.id, bindings, { cap: 3, source: "cron" }),
    ).rejects.toThrow("status unavailable");
    expect(brokenInstance.disposed).toBe(true);
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

describe("previewEvaluationRetry", () => {
  it("returns null when the application is not evaluation_failed", async () => {
    const { application } = await seedFailedApplication();
    await sql`UPDATE applications SET status = 'applied' WHERE id = ${application.id}`;

    const preview = await previewEvaluationRetry(sql, application.id, makeBindings());
    expect(preview).toBeNull();
  });

  it("marks pre-eval retries as actionable when no interview exists", async () => {
    const { application } = await seedFailedApplication();

    const preview = await previewEvaluationRetry(sql, application.id, makeBindings());
    expect(preview).toEqual({ actionable: true, kind: "pre_eval" });
  });

  it("suggests re-invite when post-eval completed with insufficient_signal", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");

    const completeInstance = makeStubInstance({
      id: interview.id,
      status: async () => ({
        status: "complete",
        output: { status: "insufficient_signal" },
      }),
    });
    const bindings = makeBindings({
      postEvalGet: async () => completeInstance,
    });

    const preview = await previewEvaluationRetry(sql, application.id, bindings);
    expect(preview).toEqual({
      actionable: false,
      reason: "post_eval_already_complete",
      suggestedAction: "reinvite",
    });
    expect(completeInstance.disposed).toBe(true);
  });

  it("marks voice-scoring retries as actionable when post-eval completed without analysis", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");

    await sql`
      INSERT INTO communication_assessments (interview_id, application_id, status, transcript, analysis)
      VALUES (
        ${interview.id},
        ${application.id},
        'completed',
        ${JSON.stringify([{ role: "candidate", content: "We shipped the feature on schedule." }])}::jsonb,
        NULL
      )
    `;

    const completeInstance = makeStubInstance({
      id: interview.id,
      status: async () => ({
        status: "complete",
        output: { status: "voice_assessment_incomplete" },
      }),
    });
    const bindings = makeBindings({
      postEvalGet: async () => completeInstance,
    });

    const preview = await previewEvaluationRetry(sql, application.id, bindings);
    expect(preview).toEqual({ actionable: true, kind: "post_eval" });
    expect(completeInstance.disposed).toBe(true);
  });

  it("disposes the restart probe instance after preview", async () => {
    const { application } = await seedFailedApplication();
    const interview = await attachInterview(application.id, "completed");

    const erroredInstance = makeStubInstance({
      id: interview.id,
      status: async () => ({ status: "errored" }),
    });
    const bindings = makeBindings({
      postEvalGet: async () => erroredInstance,
    });

    const preview = await previewEvaluationRetry(sql, application.id, bindings);
    expect(preview).toEqual({ actionable: true, kind: "post_eval" });
    expect(erroredInstance.disposed).toBe(true);
  });
});
