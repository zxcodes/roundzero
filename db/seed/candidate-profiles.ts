// @ts-nocheck
import { closeSql, makeUuid, pick, randomInt, sql } from "./util";

const headlines = [
  "Senior Frontend Engineer",
  "Full Stack Developer",
  "Backend Engineer",
  "Software Engineer",
  "DevOps Engineer",
  "Data Engineer",
  "Mobile Developer",
  "Platform Engineer",
  "Product Engineer",
  "Infrastructure Engineer",
  "ML Engineer",
  "Site Reliability Engineer",
  "Staff Engineer",
  "Security Engineer",
  "QA Engineer",
  "Embedded Systems Engineer",
  "Cloud Architect",
  "Systems Programmer",
  "React Developer",
  "API Engineer",
] as const;

const skillSets = [
  ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"],
  ["Python", "Django", "PostgreSQL", "Redis", "Docker"],
  ["Go", "Kubernetes", "Terraform", "GCP", "gRPC"],
  ["TypeScript", "Next.js", "Prisma", "Tailwind CSS", "Vercel"],
  ["Rust", "WebAssembly", "C++", "Linux", "Systems Design"],
  ["Java", "Spring Boot", "Kafka", "MongoDB", "Microservices"],
  ["Python", "FastAPI", "SQLAlchemy", "Celery", "AWS"],
  ["TypeScript", "Vue.js", "GraphQL", "PostgreSQL", "Docker"],
] as const;

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

  const profiles = candidateUsers.map((user, index) => {
    const headline = headlines[index]!;
    const skills = [...pick(skillSets, index)];
    const slug = user.name.toLowerCase().replace(/\s+/g, "-");

    const links = [
      { type: "github", url: `https://github.com/${slug}` },
      { type: "linkedin", url: `https://linkedin.com/in/${slug}` },
    ];
    if (index % 3 === 0) {
      links.push({ type: "website", url: `https://${slug}.dev` });
    }

    return {
      id: makeUuid("rz-seed-candidate-profile", index + 1),
      userId: user.id,
      headline,
      resumeKey: `resumes/${user.id}/seed-resume-${index + 1}.pdf`,
      skills,
      links,
    };
  });

  for (const profile of profiles) {
    await sql`
      INSERT INTO candidate_profiles (
        id,
        user_id,
        onboarding_completed_at,
        headline,
        resume_key,
        resume_updated_at,
        skills,
        links
      )
      VALUES (
        ${profile.id},
        ${profile.userId},
        now(),
        ${profile.headline},
        ${profile.resumeKey},
        now(),
        ${sql.json(profile.skills)},
        ${sql.json(profile.links)}
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        onboarding_completed_at = EXCLUDED.onboarding_completed_at,
        headline = EXCLUDED.headline,
        resume_key = EXCLUDED.resume_key,
        resume_updated_at = EXCLUDED.resume_updated_at,
        skills = EXCLUDED.skills,
        links = EXCLUDED.links,
        updated_at = now()
    `;
  }

  console.log(`Candidate profiles seeded/upserted: ${profiles.length}`);
}

try {
  await seedCandidateProfiles();
} finally {
  await closeSql();
}
