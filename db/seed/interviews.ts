import { closeSql, makeUuid, pick, sql } from "./util";

const interviewStatuses = [
  "completed",
  "completed",
  "completed",
  "completed",
  "completed",
  "in_progress",
] as const;

async function seedInterviews() {
  const applications = await sql<{ id: string }[]>`
    SELECT id
    FROM applications
    WHERE id IN (
      SELECT a.id
      FROM applications a
      JOIN users u ON u.id = a.candidate_id
      WHERE u.google_id LIKE 'hirely-seed-candidate-google-%'
      ORDER BY a.created_at ASC
      LIMIT 25
    )
    ORDER BY created_at ASC
  `;

  if (applications.length < 20) {
    throw new Error("Expected at least 20 seeded applications. Run applications seed first.");
  }

  const interviews = applications.map((application, index) => {
    const status = pick(interviewStatuses, index);
    const startedAt = status === "pending" ? null : new Date(Date.now() - (index + 2) * 86_400_000);
    const completedAt =
      status === "completed" && startedAt
        ? new Date(startedAt.getTime() + (45 + (index % 30)) * 60_000)
        : null;

    return {
      id: makeUuid("hirely-seed-interview", index + 1),
      applicationId: application.id,
      agentId: status === "pending" ? null : `agent-hirely-seed-${index + 1}`,
      status,
      startedAt,
      completedAt,
    };
  });

  for (const interview of interviews) {
    await sql`
      INSERT INTO interviews (id, application_id, agent_id, status, started_at, completed_at)
      VALUES (
        ${interview.id},
        ${interview.applicationId},
        ${interview.agentId},
        ${interview.status},
        ${interview.startedAt},
        ${interview.completedAt}
      )
      ON CONFLICT (id) DO UPDATE
      SET
        application_id = EXCLUDED.application_id,
        agent_id = EXCLUDED.agent_id,
        status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at
    `;
  }

  console.log(`Interviews seeded/upserted: ${interviews.length}`);
}

try {
  await seedInterviews();
} finally {
  await closeSql();
}
