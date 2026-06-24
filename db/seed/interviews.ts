// @ts-nocheck
import { closeSql, makeUuidFromSeed, sql } from "./util";

const interviewEligibleStatuses = new Set([
  "interview_invited",
  "interview_in_progress",
  "evaluated_held",
  "evaluated",
  "shortlisted",
  "rejected",
]);

function interviewStatusForApplication(status: string) {
  if (status === "interview_invited") return "pending";
  if (status === "interview_in_progress") return "in_progress";
  if (
    status === "evaluated_held" ||
    status === "evaluated" ||
    status === "shortlisted" ||
    status === "rejected"
  ) {
    return "completed";
  }
  return null;
}

async function seedInterviews() {
  const applications = await sql<{ id: string; status: string }[]>`
    SELECT a.id, a.status
    FROM applications a
    JOIN users u ON u.id = a.candidate_id
    JOIN jobs j ON j.id = a.job_id
    JOIN companies c ON c.id = j.company_id
    JOIN users owner ON owner.id = c.owner_id
    WHERE u.google_id LIKE 'rz-seed-candidate-google-%'
      AND owner.google_id LIKE 'rz-seed-company-google-%'
      AND NOT EXISTS (
        SELECT 1
        FROM interviews i
        WHERE i.application_id = a.id
      )
    ORDER BY a.created_at ASC
  `;

  const eligible = applications.filter((application) =>
    interviewEligibleStatuses.has(application.status),
  );

  if (eligible.length === 0) {
    console.log("Interviews seeded/upserted: 0 (already present)");
    return;
  }

  const interviews = eligible.map((application, index) => {
    const status = interviewStatusForApplication(application.status)!;
    const invitedAt = new Date(Date.now() - (index + 3) * 86_400_000);
    const startedAt =
      status === "pending" ? null : new Date(invitedAt.getTime() + 12 * 60 * 60 * 1000);
    const completedAt =
      status === "completed" && startedAt
        ? new Date(startedAt.getTime() + (40 + (index % 25)) * 60_000)
        : null;
    const expiresAt = new Date(Date.now() + (24 + (index % 48)) * 60 * 60 * 1000);

    return {
      id: makeUuidFromSeed(`rz-seed-interview-${application.id}`),
      applicationId: application.id,
      agentId: status === "pending" ? null : `agent-rz-seed-${index + 1}`,
      status,
      invitedAt,
      startedAt,
      completedAt,
      expiresAt,
    };
  });

  for (const interview of interviews) {
    await sql`
      INSERT INTO interviews (
        id, application_id, agent_id, type, metadata, status,
        invited_at, started_at, completed_at, created_at, updated_at
      )
      VALUES (
        ${interview.id},
        ${interview.applicationId},
        ${interview.agentId},
        ${"full"},
        ${sql.json({ expiresAt: interview.expiresAt.toISOString() })},
        ${interview.status},
        ${interview.invitedAt},
        ${interview.startedAt},
        ${interview.completedAt},
        ${interview.invitedAt},
        ${interview.completedAt ?? interview.invitedAt}
      )
      ON CONFLICT (id) DO UPDATE
      SET
        application_id = EXCLUDED.application_id,
        agent_id = EXCLUDED.agent_id,
        type = EXCLUDED.type,
        metadata = EXCLUDED.metadata,
        status = EXCLUDED.status,
        invited_at = EXCLUDED.invited_at,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at,
        updated_at = now()
    `;
  }

  console.log(`Interviews seeded/upserted: ${interviews.length}`);
}

try {
  await seedInterviews();
} finally {
  await closeSql();
}