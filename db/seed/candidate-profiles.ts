import { closeSql, copycat, makeUuid, pick, randomInt, sql } from "./util";

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

const workHistoryTemplates = [
  { company: "Google", title: "Software Engineer", years: "2019-2022" },
  { company: "Meta", title: "Frontend Engineer", years: "2020-2023" },
  { company: "Stripe", title: "Backend Engineer", years: "2018-2021" },
  { company: "Shopify", title: "Full Stack Developer", years: "2021-2024" },
  { company: "Datadog", title: "Platform Engineer", years: "2019-2023" },
  { company: "Cloudflare", title: "Systems Engineer", years: "2020-2024" },
  { company: "Vercel", title: "Product Engineer", years: "2022-2025" },
  { company: "Linear", title: "Staff Engineer", years: "2021-2025" },
  { company: "Figma", title: "Frontend Engineer", years: "2018-2022" },
  { company: "Notion", title: "Full Stack Engineer", years: "2020-2023" },
] as const;

const linkTypes = ["github", "linkedin", "website", "twitter"] as const;

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
    const bio = copycat.paragraph(`rz-seed-candidate-bio-${index + 1}`);
    const slug = user.name.toLowerCase().replace(/\s+/g, "-");

    const historyA = pick(workHistoryTemplates, index);
    const historyB = pick(workHistoryTemplates, index + 3);
    const workHistory = [
      { company: historyA.company, title: historyA.title, years: historyA.years },
      { company: historyB.company, title: historyB.title, years: historyB.years },
    ];

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
      bio: `${bio} Passionate about building reliable software and working with great teams.`,
      skills,
      workHistory,
      links,
    };
  });

  for (const profile of profiles) {
    await sql`
      INSERT INTO candidate_profiles (id, user_id, headline, bio, skills, work_history, links)
      VALUES (
        ${profile.id}, ${profile.userId}, ${profile.headline}, ${profile.bio},
        ${sql.json(profile.skills)}, ${sql.json(profile.workHistory)}, ${sql.json(profile.links)}
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        headline = EXCLUDED.headline,
        bio = EXCLUDED.bio,
        skills = EXCLUDED.skills,
        work_history = EXCLUDED.work_history,
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
