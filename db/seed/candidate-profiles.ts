import { closeSql, copycat, makeUuid, pick, sql } from "./util";

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
    const skills = pick(skillSets, index);
    const bio = copycat.paragraph(`rz-seed-candidate-bio-${index + 1}`);

    return {
      id: makeUuid("rz-seed-candidate-profile", index + 1),
      userId: user.id,
      headline,
      bio: `${bio} Passionate about building reliable software and working with great teams.`,
      skills: JSON.stringify([...skills]),
    };
  });

  for (const profile of profiles) {
    await sql`
      INSERT INTO candidate_profiles (id, user_id, headline, bio, skills)
      VALUES (${profile.id}, ${profile.userId}, ${profile.headline}, ${profile.bio}, ${profile.skills}::jsonb)
      ON CONFLICT (user_id) DO UPDATE
      SET
        headline = EXCLUDED.headline,
        bio = EXCLUDED.bio,
        skills = EXCLUDED.skills,
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
