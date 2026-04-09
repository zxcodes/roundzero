import { closeSql, makeUuidFromSeed, sql } from "./util";

type SeedApplication = {
  id: string;
  candidateId: string;
  companyOwnerId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

const candidateStatusNotifications = new Set(["interviewing", "evaluated", "rejected"]);

async function seedNotifications() {
  const applications = await sql<SeedApplication[]>`
    SELECT
      a.id,
      a.candidate_id AS "candidateId",
      c.owner_id AS "companyOwnerId",
      a.job_id AS "jobId",
      j.title AS "jobTitle",
      c.name AS "companyName",
      u.name AS "candidateName",
      a.status,
      a.created_at AS "createdAt",
      a.updated_at AS "updatedAt"
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN companies c ON c.id = j.company_id
    JOIN users u ON u.id = a.candidate_id
    WHERE u.google_id LIKE 'rz-seed-candidate-google-%'
    ORDER BY a.created_at ASC
  `;

  const notifications = applications.flatMap((application) => {
    const baseRows = [
      {
        id: makeUuidFromSeed(`rz-seed-notification-company-${application.id}`),
        userId: application.companyOwnerId,
        type: "new_applicant",
        payload: {
          applicationId: application.id,
          jobId: application.jobId,
          jobTitle: application.jobTitle,
          candidateName: application.candidateName,
        },
        readAt: application.status === "applied" ? null : application.updatedAt,
        createdAt: application.createdAt,
      },
    ];

    if (!candidateStatusNotifications.has(application.status)) {
      return baseRows;
    }

    return [
      ...baseRows,
      {
        id: makeUuidFromSeed(`rz-seed-notification-candidate-${application.id}`),
        userId: application.candidateId,
        type: "application_status_changed",
        payload: {
          applicationId: application.id,
          jobId: application.jobId,
          jobTitle: application.jobTitle,
          companyName: application.companyName,
          status: application.status,
        },
        readAt: application.status === "evaluated" ? null : application.updatedAt,
        createdAt: application.updatedAt,
      },
    ];
  });

  for (const notification of notifications) {
    await sql`
      INSERT INTO notifications (id, user_id, type, payload, read_at, created_at)
      VALUES (
        ${notification.id},
        ${notification.userId},
        ${notification.type},
        ${notification.payload},
        ${notification.readAt},
        ${notification.createdAt}
      )
      ON CONFLICT (id) DO UPDATE
      SET
        user_id = EXCLUDED.user_id,
        type = EXCLUDED.type,
        payload = EXCLUDED.payload,
        read_at = EXCLUDED.read_at,
        created_at = EXCLUDED.created_at
    `;
  }

  console.log(`Notifications seeded/upserted: ${notifications.length}`);
}

try {
  await seedNotifications();
} finally {
  await closeSql();
}
