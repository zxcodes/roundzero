// @ts-nocheck
import { closeSql, makeUuid, sql } from "./util";

async function seedCandidateProfiles() {
  const candidateUsers = await sql<{ id: string; name: string }[]>`
    SELECT id, name
    FROM users
    WHERE role = 'candidate'
      AND google_id LIKE 'rz-seed-candidate-google-%'
    ORDER BY created_at ASC
    LIMIT 20
  `;

  if (candidateUsers.length < 20) {
    throw new Error("Expected at least 20 seeded candidate users. Run users seed first.");
  }

  for (let i = 0; i < candidateUsers.length; i++) {
    const user = candidateUsers[i]!;

    await sql`
      INSERT INTO candidate_profiles (
        id,
        user_id,
        onboarding_completed_at,
        resume_key,
        resume_updated_at
      )
      VALUES (
        ${makeUuid("rz-seed-candidate-profile", i + 1)},
        ${user.id},
        now(),
        ${`resumes/${user.id}/seed-resume-${i + 1}.pdf`},
        now()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        onboarding_completed_at = EXCLUDED.onboarding_completed_at,
        resume_key = EXCLUDED.resume_key,
        resume_updated_at = EXCLUDED.resume_updated_at,
        updated_at = now()
    `;
  }

  console.log(`Candidate profiles seeded/upserted: ${candidateUsers.length}`);
}

try {
  await seedCandidateProfiles();
} finally {
  await closeSql();
}
