import { describe, expect, it, vi } from "vitest";

import { listAccountsPendingErasure } from "@/features/accounts/queries/queries_sql";
import { eraseDeletedAccount } from "@/features/accounts/server/cleanup";
import { createApplication } from "@/features/applications/queries/queries_sql";
import {
  getTestDb,
  makeTestResumeKey,
  seedCandidateProfile,
  seedCompany,
  seedJob,
  seedUser,
} from "@/shared/__tests__/test-utils";

const sql = getTestDb();

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function softDeleteUser(userId: string, deletedAt: Date) {
  await sql`UPDATE users SET deleted_at = ${deletedAt} WHERE id = ${userId}`;
}

function makeFakeR2Bucket(deleteImplementation?: (key: string) => Promise<void>) {
  const deleteFn = vi.fn<(key: string) => Promise<void>>(
    deleteImplementation ?? (async () => undefined),
  );
  return {
    bucket: { delete: deleteFn } as unknown as R2Bucket,
    deleteFn,
  };
}

function makeExternalStores(eraseVoiceHistory?: (interviewId: string) => Promise<void>) {
  return {
    eraseVoiceHistory: vi.fn(eraseVoiceHistory ?? (async () => undefined)),
  };
}

async function seedCandidatePipeline() {
  const { company } = await seedCompany();
  const { job } = await seedJob({ companyId: company.id, status: "open" });
  const { user: candidate, profile } = await seedCandidateProfile();
  const profileResumeKey = makeTestResumeKey(candidate.id, "profile-resume.pdf");
  await sql`
    UPDATE candidate_profiles
    SET resume_key = ${profileResumeKey}, resume_updated_at = now()
    WHERE id = ${profile.id}
  `;

  const appResumeKey = makeTestResumeKey(candidate.id, "application-resume.pdf");
  const application = await createApplication(sql, {
    jobId: job.id,
    candidateId: candidate.id,
    resumeKey: appResumeKey,
    metadata: { resumeText: "Jane Doe built distributed systems at Acme Corp." },
    status: "evaluated",
  });
  if (!application) throw new Error("seed failed");

  const [interview] = await sql`
    INSERT INTO interviews (application_id, status, completed_at)
    VALUES (${application.id}, 'completed', now())
    RETURNING id
  `;

  const interviewMetadata = {
    expiresAt: new Date().toISOString(),
    contextState: {
      candidateName: "Jane Doe",
      candidateSummary: "Built distributed systems at Acme Corp.",
    },
    jobSnapshot: {
      jobDescription: "Build platform APIs",
      jobRequirements: ["TypeScript"],
      customQuestions: ["Why this role?"],
      snapshottedAt: new Date().toISOString(),
    },
  };
  await sql`
    UPDATE interviews
    SET metadata = ${sql.json(interviewMetadata)}
    WHERE id = ${interview.id}
  `;

  await sql`
    INSERT INTO interview_messages (interview_id, turn_id, role, content)
    VALUES (
      ${interview.id},
      ${crypto.randomUUID()},
      'user',
      'My biggest project was rebuilding the payments API.'
    )
  `;

  const audioKey = `voice/${candidate.id}/session-audio.webm`;
  await sql`
    INSERT INTO communication_assessments (
      interview_id,
      application_id,
      status,
      audio_key,
      transcript,
      analysis
    )
    VALUES (
      ${interview.id},
      ${application.id},
      'completed',
      ${audioKey},
      ${JSON.stringify([{ role: "user", text: "I led the migration." }])}::jsonb,
      ${JSON.stringify({ clarity: 8 })}::jsonb
    )
  `;

  await sql`
    INSERT INTO pre_evaluations (
      application_id,
      score,
      confidence,
      next_step,
      raw_response
    )
    VALUES (
      ${application.id},
      7.5,
      'high',
      'invite',
      ${JSON.stringify({ rationale: "Strong backend experience" })}::jsonb
    )
  `;

  await sql`
    INSERT INTO reports (
      interview_id,
      application_id,
      summary,
      strengths,
      weaknesses,
      insights,
      evidence,
      screening_answers,
      scores,
      recommendation,
      answer_authenticity
    )
    VALUES (
      ${interview.id},
      ${application.id},
      'Strong systems background with clear communication.',
      ${JSON.stringify(["Distributed systems"])}::jsonb,
      ${JSON.stringify(["Limited frontend depth"])}::jsonb,
      ${JSON.stringify(["Would thrive on platform teams"])}::jsonb,
      ${JSON.stringify([{ quote: "I owned the migration end to end." }])}::jsonb,
      ${JSON.stringify([{ question: "Why this role?", answer: "I love infra." }])}::jsonb,
      ${JSON.stringify({ overall: 8.2 })}::jsonb,
      'yes',
      ${JSON.stringify({ verdict: "authentic" })}::jsonb
    )
  `;

  await sql`
    INSERT INTO notifications (user_id, type, payload)
    VALUES (
      ${candidate.id},
      'application_update',
      ${JSON.stringify({ jobTitle: "Platform Engineer", candidateName: candidate.name })}::jsonb
    )
  `;

  await sql`
    INSERT INTO feedback (user_id, role, type, message)
    VALUES (${candidate.id}, 'candidate', 'bug', 'The voice step failed on Safari.')
  `;

  return {
    candidate,
    application,
    interviewId: interview.id as string,
    profileResumeKey,
    appResumeKey,
    audioKey,
  };
}

describe("eraseDeletedAccount", () => {
  it("preserves database references and PII when R2 deletion fails", async () => {
    const { candidate, application, interviewId, profileResumeKey, appResumeKey, audioKey } =
      await seedCandidatePipeline();
    await softDeleteUser(candidate.id, daysAgo(31));

    const deletionError = new Error("R2 unavailable");
    const { bucket, deleteFn } = makeFakeR2Bucket(async () => {
      throw deletionError;
    });

    await expect(
      eraseDeletedAccount(sql, bucket, candidate.id, makeExternalStores()),
    ).rejects.toThrow(deletionError);
    expect(deleteFn).toHaveBeenCalledTimes(1);

    const [userRow] = await sql`
      SELECT name, email, anonymized_at
      FROM users
      WHERE id = ${candidate.id}
    `;
    expect(userRow?.name).toBe(candidate.name);
    expect(userRow?.email).toBe(candidate.email);
    expect(userRow?.anonymized_at).toBeNull();

    const [profileRow] = await sql`
      SELECT resume_key
      FROM candidate_profiles
      WHERE user_id = ${candidate.id}
    `;
    expect(profileRow?.resume_key).toBe(profileResumeKey);

    const [applicationRow] = await sql`
      SELECT resume_key, metadata
      FROM applications
      WHERE id = ${application.id}
    `;
    expect(applicationRow?.resume_key).toBe(appResumeKey);
    expect(applicationRow?.metadata).toEqual({
      resumeText: "Jane Doe built distributed systems at Acme Corp.",
    });

    const [assessmentRow] = await sql`
      SELECT audio_key
      FROM communication_assessments
      WHERE application_id = ${application.id}
    `;
    expect(assessmentRow?.audio_key).toBe(audioKey);

    const [messageRow] = await sql`
      SELECT content
      FROM interview_messages
      WHERE interview_id = ${interviewId}
    `;
    expect(messageRow?.content).toBe("My biggest project was rebuilding the payments API.");
  });

  it("anonymizes a candidate and scrubs PII while preserving evaluation scores", async () => {
    const { candidate, application, interviewId, profileResumeKey, appResumeKey, audioKey } =
      await seedCandidatePipeline();
    await softDeleteUser(candidate.id, daysAgo(31));

    const { bucket, deleteFn } = makeFakeR2Bucket();
    const externalStores = makeExternalStores();
    const first = await eraseDeletedAccount(sql, bucket, candidate.id, externalStores);
    expect(first).toEqual({ erased: true });
    expect(externalStores.eraseVoiceHistory).toHaveBeenCalledWith(interviewId);

    const deletedKeys = deleteFn.mock.calls.map(([key]) => key).sort();
    expect(deletedKeys).toEqual([appResumeKey, audioKey, profileResumeKey].sort());

    const [userRow] = await sql`
      SELECT name, email, picture, google_id, anonymized_at
      FROM users
      WHERE id = ${candidate.id}
    `;
    expect(userRow?.name).toBe("Deleted user");
    expect(userRow?.email).toBe(`deleted+${candidate.id}@deleted.invalid`);
    expect(userRow?.picture).toBeNull();
    expect(userRow?.google_id).not.toBeNull();
    expect(userRow?.anonymized_at).not.toBeNull();

    const [profileRow] = await sql`
      SELECT resume_key, resume_updated_at
      FROM candidate_profiles
      WHERE user_id = ${candidate.id}
    `;
    expect(profileRow?.resume_key).toBeNull();
    expect(profileRow?.resume_updated_at).toBeNull();

    const [appRow] = await sql`
      SELECT resume_key, metadata
      FROM applications
      WHERE id = ${application.id}
    `;
    expect(appRow?.resume_key).toBeNull();
    expect(appRow?.metadata).toEqual({});

    const [messageRow] = await sql`
      SELECT content
      FROM interview_messages im
      JOIN interviews i ON i.id = im.interview_id
      WHERE i.application_id = ${application.id}
    `;
    expect(messageRow?.content).toBe("[redacted]");

    const [interviewRow] = await sql`
      SELECT metadata
      FROM interviews
      WHERE id = ${interviewId}
    `;
    const metadata =
      typeof interviewRow?.metadata === "string"
        ? JSON.parse(interviewRow.metadata)
        : interviewRow?.metadata;
    expect(metadata?.contextState).toBeUndefined();
    expect(metadata?.jobSnapshot?.jobDescription).toBe("Build platform APIs");
    expect(metadata?.expiresAt).toBeDefined();

    const [commRow] = await sql`
      SELECT transcript, analysis, audio_key
      FROM communication_assessments
      WHERE application_id = ${application.id}
    `;
    expect(commRow?.transcript).toEqual([]);
    expect(commRow?.analysis).toBeNull();
    expect(commRow?.audio_key).toBeNull();

    const [preEvalRow] = await sql`
      SELECT score, raw_response
      FROM pre_evaluations
      WHERE application_id = ${application.id}
    `;
    expect(preEvalRow?.score).toBe(7.5);
    expect(preEvalRow?.raw_response).toBeNull();

    const [reportRow] = await sql`
      SELECT summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, answer_authenticity
      FROM reports
      WHERE application_id = ${application.id}
    `;
    expect(reportRow?.summary).toBe("[redacted]");
    expect(reportRow?.strengths).toEqual([]);
    expect(reportRow?.weaknesses).toEqual([]);
    expect(reportRow?.insights).toEqual([]);
    expect(reportRow?.evidence).toEqual([]);
    expect(reportRow?.screening_answers).toEqual([]);
    expect(reportRow?.answer_authenticity).toBeNull();
    const scores =
      typeof reportRow?.scores === "string" ? JSON.parse(reportRow.scores) : reportRow?.scores;
    expect(scores).toEqual({ overall: 8.2 });
    expect(reportRow?.recommendation).toBe("yes");

    const [notificationCount] = await sql`
      SELECT count(*)::int AS count
      FROM notifications
      WHERE user_id = ${candidate.id}
    `;
    expect(notificationCount?.count).toBe(0);

    const [feedbackCount] = await sql`
      SELECT count(*)::int AS count
      FROM feedback
      WHERE user_id = ${candidate.id}
    `;
    expect(feedbackCount?.count).toBe(0);
  });

  it("does not anonymize the account when Durable Object voice-history erasure fails", async () => {
    const { candidate, interviewId } = await seedCandidatePipeline();
    await softDeleteUser(candidate.id, daysAgo(31));

    const voiceError = new Error("Voice history unavailable");
    const externalStores = makeExternalStores(async () => {
      throw voiceError;
    });
    const { bucket } = makeFakeR2Bucket();

    await expect(eraseDeletedAccount(sql, bucket, candidate.id, externalStores)).rejects.toThrow(
      voiceError,
    );
    expect(externalStores.eraseVoiceHistory).toHaveBeenCalledWith(interviewId);

    const [userRow] = await sql`
      SELECT name, anonymized_at
      FROM users
      WHERE id = ${candidate.id}
    `;
    expect(userRow?.name).toBe(candidate.name);
    expect(userRow?.anonymized_at).toBeNull();
  });

  it("is idempotent on a second run", async () => {
    const { candidate } = await seedCandidatePipeline();
    await softDeleteUser(candidate.id, daysAgo(31));

    const { bucket } = makeFakeR2Bucket();
    const first = await eraseDeletedAccount(sql, bucket, candidate.id, makeExternalStores());
    expect(first).toEqual({ erased: true });

    const [afterFirst] = await sql`
      SELECT anonymized_at
      FROM users
      WHERE id = ${candidate.id}
    `;

    const second = await eraseDeletedAccount(sql, bucket, candidate.id, makeExternalStores());
    expect(second).toEqual({ erased: false });

    const [afterSecond] = await sql`
      SELECT anonymized_at
      FROM users
      WHERE id = ${candidate.id}
    `;
    expect(afterSecond?.anonymized_at?.toISOString()).toBe(
      afterFirst?.anonymized_at?.toISOString(),
    );
  });

  it("does not select users still inside the 30-day grace period", async () => {
    const candidate = await seedUser({ role: "candidate" });
    await softDeleteUser(candidate.id, daysAgo(10));

    const pending = await listAccountsPendingErasure(sql, { limit: 50 });
    expect(pending.map((row) => row.id)).not.toContain(candidate.id);
  });

  it("does not erase users still inside the 30-day grace period", async () => {
    const { candidate } = await seedCandidatePipeline();
    await softDeleteUser(candidate.id, daysAgo(10));

    const { bucket, deleteFn } = makeFakeR2Bucket();
    const result = await eraseDeletedAccount(sql, bucket, candidate.id, makeExternalStores());
    expect(result).toEqual({ erased: false });
    expect(deleteFn).not.toHaveBeenCalled();

    const [userRow] = await sql`
      SELECT name, anonymized_at
      FROM users
      WHERE id = ${candidate.id}
    `;
    expect(userRow?.name).not.toBe("Deleted user");
    expect(userRow?.anonymized_at).toBeNull();
  });

  it("archives open jobs when the company owner is the sole active member", async () => {
    const { company, owner } = await seedCompany();
    const { job: openJob } = await seedJob({ companyId: company.id, status: "open" });
    const { job: closedJob } = await seedJob({ companyId: company.id, status: "closed" });
    await softDeleteUser(owner.id, daysAgo(31));

    const { bucket } = makeFakeR2Bucket();
    const result = await eraseDeletedAccount(sql, bucket, owner.id, makeExternalStores());
    expect(result).toEqual({ erased: true });

    const [ownerRow] = await sql`
      SELECT name, anonymized_at
      FROM users
      WHERE id = ${owner.id}
    `;
    expect(ownerRow?.name).toBe("Deleted user");
    expect(ownerRow?.anonymized_at).not.toBeNull();

    const [companyRow] = await sql`SELECT id FROM companies WHERE id = ${company.id}`;
    expect(companyRow?.id).toBe(company.id);

    const [openJobRow] = await sql`
      SELECT status, archived_at
      FROM jobs
      WHERE id = ${openJob.id}
    `;
    expect(openJobRow?.status).toBe("closed");
    expect(openJobRow?.archived_at).not.toBeNull();

    const [closedJobRow] = await sql`
      SELECT status, archived_at
      FROM jobs
      WHERE id = ${closedJob.id}
    `;
    expect(closedJobRow?.status).toBe("closed");
    expect(closedJobRow?.archived_at).toBeNull();
  });

  it("keeps open jobs when another active company member remains", async () => {
    const { company, owner } = await seedCompany();
    const otherMember = await seedUser({ role: "company" });
    await sql`
      INSERT INTO company_members (company_id, user_id, role, status)
      VALUES (${company.id}, ${otherMember.id}, 'member', 'active')
    `;
    const { job } = await seedJob({ companyId: company.id, status: "open" });
    await softDeleteUser(owner.id, daysAgo(31));

    const { bucket } = makeFakeR2Bucket();
    const result = await eraseDeletedAccount(sql, bucket, owner.id, makeExternalStores());
    expect(result).toEqual({ erased: true });

    const [jobRow] = await sql`
      SELECT status, archived_at
      FROM jobs
      WHERE id = ${job.id}
    `;
    expect(jobRow?.status).toBe("open");
    expect(jobRow?.archived_at).toBeNull();
  });
});
