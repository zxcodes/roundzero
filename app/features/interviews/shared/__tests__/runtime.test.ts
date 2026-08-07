import { describe, expect, it } from "vitest";

import { createApplication } from "@/features/applications/queries/queries_sql";
import {
  createInterview,
  createInterviewMessage,
  getInterviewContextById,
  updateInterviewMetadata,
} from "@/features/interviews/queries/queries_sql";
import {
  areRequiredScreeningQuestionsResolved,
  buildInterviewSystemPrompt,
  buildInterviewJobSnapshot,
  ensureInterviewRuntimeMetadata,
  interviewContinueResponseSchema,
  jobSnapshotFromLegacyContextState,
  loadCandidateSummaryFromApplication,
  loadInterviewRuntimeContext,
  parseInterviewMetadata,
} from "@/features/interviews/shared/runtime";
import { createPreEvaluation } from "@/features/pre-evaluations/queries/queries_sql";
import { getTestDb, makeTestResumeKey, seedCompany, seedUser } from "@/shared/__tests__/test-utils";

const sql = getTestDb();

describe("interview response schema", () => {
  it("accepts a structured greeting and rejects candidate-visible JSON text", () => {
    expect(
      interviewContinueResponseSchema.parse({
        action: "continue",
        message: "Hi Jordan, what is your notice period?",
        reason: null,
      }),
    ).toEqual({
      action: "continue",
      message: "Hi Jordan, what is your notice period?",
      reason: null,
    });
    expect(
      interviewContinueResponseSchema.safeParse(
        '```json\n{"action":"continue","message":"Hi Jordan","reason":null}\n```',
      ).success,
    ).toBe(false);
  });
});

const seedInterviewContext = async () => {
  const { company } = await seedCompany({ name: "Runtime Co" });
  const candidate = await seedUser({ role: "candidate", name: "Jordan Lee" });
  const [job] = await sql`
    INSERT INTO jobs (
      company_id,
      title,
      description,
      screening_questions,
      status,
      final_report_target
    )
    VALUES (
      ${company.id},
      ${"Backend Engineer"},
      ${"Build APIs and data pipelines\n\n## Requirements\n\n- TypeScript\n- Postgres"},
      ${["What is your notice period?"]},
      ${"open"},
      ${5}
    )
    RETURNING id
  `;

  const application = await createApplication(sql, {
    jobId: job.id,
    candidateId: candidate.id,
    resumeKey: makeTestResumeKey(candidate.id),
    metadata: { resumeText: "Built payment APIs and led schema migrations." },
    status: "interview_invited",
  });
  if (!application) {
    throw new Error("seed failed");
  }

  await createPreEvaluation(sql, {
    applicationId: application.id,
    score: 7.5,
    missingRequirements: ["Kubernetes"],
    confidence: "high",
    nextStep: "interview_invited",
    consistencyScore: 8.1,
    rawResponse: {
      consistencyScore: 8.1,
      redFlags: ["Unsupported metric"],
      explanation: "Resume claims lack supporting detail.",
    },
    model: "test-model",
    promptVersion: "test-v1",
  });

  const interview = await createInterview(sql, {
    applicationId: application.id,
    agentId: null,
    type: "full",
    metadata: { expiresAt: new Date().toISOString() },
    status: "pending",
    invitedAt: new Date(),
    startedAt: null,
    completedAt: null,
  });
  if (!interview) {
    throw new Error("seed failed");
  }

  return { interviewId: interview.id, applicationId: application.id };
};

describe("interview runtime metadata", () => {
  it("separates continuing questions from the finishing response action", async () => {
    const { interviewId } = await seedInterviewContext();
    const interview = await getInterviewContextById(sql, { id: interviewId });
    const metadata = await ensureInterviewRuntimeMetadata(sql, interview!);
    const runtimeContext = await loadInterviewRuntimeContext(sql, interview!, metadata);
    const prompt = buildInterviewSystemPrompt({
      runtimeContext,
      screeningCoverage: { "1": "answered" },
    });

    expect(prompt).toContain("Choose action='continue' with reason=null");
    expect(prompt).toContain("Choose action='finish' with a concise reason");
    expect(prompt).toContain("There is no fixed minimum, maximum, target, or turn count");
    expect(prompt).toContain("A long resume does not require a long interview");
    expect(prompt).toContain("highest-signal experiences and claims for this role");
    expect(prompt).not.toContain("end_interview");
  });

  it("requires every company screening question before normal completion", () => {
    expect(areRequiredScreeningQuestionsResolved(0, {})).toBe(true);
    expect(areRequiredScreeningQuestionsResolved(2, { "1": "answered" })).toBe(false);
    expect(areRequiredScreeningQuestionsResolved(2, { "1": "answered", "2": "skipped" })).toBe(
      true,
    );
  });

  it("ignores legacy bloated metadata keys while keeping valid fields", () => {
    const expiresAt = new Date().toISOString();
    const parsed = parseInterviewMetadata({
      expiresAt,
      contextState: { candidateSummary: "legacy blob" },
      preEvaluationScore: 8,
    });

    expect(parsed.jobSnapshot).toBeUndefined();
    expect(parsed.expiresAt).toBe(expiresAt);
  });

  it("preserves valid metadata fields when another subtree is invalid", () => {
    const expiresAt = new Date().toISOString();
    const parsed = parseInterviewMetadata({
      expiresAt,
      jobSnapshot: {
        jobDescription: "Frozen role",
        jobRequirements: ["Go"],
        customQuestions: ["Why us?"],
        snapshottedAt: expiresAt,
      },
      integrity: { messages: "not-an-array" },
    });

    expect(parsed.expiresAt).toBe(expiresAt);
    expect(parsed.jobSnapshot?.jobDescription).toBe("Frozen role");
    expect(parsed.integrity).toBeUndefined();
  });

  it("loads candidate summary when application metadata has sibling keys", () => {
    expect(loadCandidateSummaryFromApplication({ resumeText: "  Built APIs.  " })).toBe(
      "Built APIs.",
    );
    expect(
      loadCandidateSummaryFromApplication({
        resumeText: "Built payment APIs.",
        shortlist: { note: "Strong fit", updatedAt: new Date().toISOString() },
        evalRetryCount: 1,
      }),
    ).toContain("payment APIs");
    expect(loadCandidateSummaryFromApplication({ summary: "legacy field" })).toBe("");
  });

  it("persists only a slim job snapshot and derives runtime context on demand", async () => {
    const { interviewId } = await seedInterviewContext();
    const interview = await getInterviewContextById(sql, { id: interviewId });
    expect(interview).not.toBeNull();

    const metadata = await ensureInterviewRuntimeMetadata(sql, interview!);
    expect(metadata.jobSnapshot?.jobDescription).toContain("Build APIs");
    expect(metadata.jobSnapshot?.customQuestions).toEqual(["What is your notice period?"]);
    expect(metadata.jobSnapshot?.jobRequirements).toEqual([]);
    expect(Object.keys(metadata)).not.toContain("contextState");
    expect(Object.keys(metadata)).not.toContain("preEvaluationScore");

    const runtimeContext = await loadInterviewRuntimeContext(sql, interview!, metadata);
    expect(runtimeContext.candidateSummary).toContain("payment APIs");
    expect(runtimeContext.candidateName).toBe("Jordan Lee");
    expect(runtimeContext.preEvaluation.score).toBe(7.5);
    expect(runtimeContext.preEvaluation.authenticityFlags).toEqual(["Unsupported metric"]);
    expect(runtimeContext.jobDescription).toBe(metadata.jobSnapshot?.jobDescription);
  });

  it("reads nested legacy raw_response slop checks", async () => {
    const { interviewId, applicationId } = await seedInterviewContext();
    await sql`
      UPDATE pre_evaluations
      SET raw_response = ${sql.json({
        preEvaluation: { score: 7.5 },
        slopCheck: {
          consistencyScore: 6.5,
          redFlags: ["Buzzword heavy"],
          explanation: "Legacy nested shape.",
        },
      })}
      WHERE application_id = ${applicationId}
    `;

    const interview = await getInterviewContextById(sql, { id: interviewId });
    const metadata = await ensureInterviewRuntimeMetadata(sql, interview!);
    const runtimeContext = await loadInterviewRuntimeContext(sql, interview!, metadata);

    expect(runtimeContext.preEvaluation.authenticityFlags).toEqual(["Buzzword heavy"]);
    expect(runtimeContext.preEvaluation.authenticityExplanation).toBe("Legacy nested shape.");
  });

  it("migrates legacy contextState into jobSnapshot without reading the live job row", async () => {
    const { interviewId } = await seedInterviewContext();
    await updateInterviewMetadata(sql, {
      id: interviewId,
      metadata: {
        expiresAt: new Date().toISOString(),
        contextState: {
          jobDescription: "Legacy frozen description",
          jobRequirements: ["Rust"],
          customQuestions: ["Legacy screening question"],
          candidateSummary: "Should not be persisted again",
        },
      },
    });

    await sql`
      UPDATE jobs
      SET description = ${"Live job description that must not leak"},
          screening_questions = ${["Live screening question"]},
          updated_at = now()
      WHERE id = ${(await getInterviewContextById(sql, { id: interviewId }))!.jobId}
    `;

    const interview = await getInterviewContextById(sql, { id: interviewId });
    const metadata = await ensureInterviewRuntimeMetadata(sql, interview!);

    expect(metadata.jobSnapshot?.jobDescription).toBe("Legacy frozen description");
    expect(metadata.jobSnapshot?.customQuestions).toEqual(["Legacy screening question"]);
    expect(metadata.jobSnapshot?.jobRequirements).toEqual(["Rust"]);
    expect(jobSnapshotFromLegacyContextState(interview!.metadata)?.jobDescription).toBe(
      "Legacy frozen description",
    );
  });

  it("refreshes the job snapshot and clears interview state when forceJobSnapshotRefresh is set", async () => {
    const { interviewId } = await seedInterviewContext();
    const interview = await getInterviewContextById(sql, { id: interviewId });
    expect(interview).not.toBeNull();

    const initial = await ensureInterviewRuntimeMetadata(sql, interview!);
    await updateInterviewMetadata(sql, {
      id: interviewId,
      metadata: {
        ...initial,
        screeningCoverage: { "1": "answered" },
        integrity: {
          messages: [
            {
              messageId: crypto.randomUUID(),
              pasteCount: 1,
              pasteCharCount: 10,
              copiedFrom: [],
            },
          ],
        },
      },
    });
    await createInterviewMessage(sql, {
      interviewId,
      turnId: crypto.randomUUID(),
      role: "candidate",
      content: "Old transcript should not survive re-invite metadata refresh.",
    });

    await sql`
      UPDATE jobs
      SET description = ${"Updated role description"},
          screening_questions = ${["Updated screening question"]},
          updated_at = now()
      WHERE id = ${interview!.jobId}
    `;

    const staleReload = await getInterviewContextById(sql, { id: interviewId });
    const refreshed = await ensureInterviewRuntimeMetadata(sql, staleReload!, {
      forceJobSnapshotRefresh: true,
    });

    expect(refreshed.jobSnapshot?.jobDescription).toContain("Updated role description");
    expect(refreshed.jobSnapshot?.customQuestions).toEqual(["Updated screening question"]);
    expect(refreshed.jobSnapshot?.jobDescription).not.toBe(initial.jobSnapshot?.jobDescription);
    expect(refreshed.screeningCoverage).toEqual({});
    expect(refreshed.integrity).toBeUndefined();
  });

  it("buildInterviewJobSnapshot reads the current job row", async () => {
    const { interviewId } = await seedInterviewContext();
    const interview = await getInterviewContextById(sql, { id: interviewId });
    const snapshot = await buildInterviewJobSnapshot(sql, interview!.jobId);

    expect(snapshot.jobDescription).toContain("Build APIs");
    expect(snapshot.customQuestions).toEqual(["What is your notice period?"]);
  });

  it("strips unknown keys when persisting metadata updates", async () => {
    const { interviewId } = await seedInterviewContext();
    await updateInterviewMetadata(sql, {
      id: interviewId,
      metadata: {
        expiresAt: new Date().toISOString(),
        jobSnapshot: {
          jobDescription: "Frozen description",
          jobRequirements: ["Go"],
          customQuestions: ["Why us?"],
          snapshottedAt: new Date().toISOString(),
        },
        legacyField: "should-not-round-trip",
      },
    });

    const reloaded = await getInterviewContextById(sql, { id: interviewId });
    const metadata = parseInterviewMetadata(reloaded!.metadata);
    expect(metadata.jobSnapshot?.jobDescription).toBe("Frozen description");
    expect((metadata as Record<string, unknown>).legacyField).toBeUndefined();
  });
});
