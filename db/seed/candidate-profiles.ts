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
  { company: "Google", title: "Software Engineer", startMonth: "2019-01", endMonth: "2022-12" },
  { company: "Meta", title: "Frontend Engineer", startMonth: "2020-02", endMonth: "2023-11" },
  { company: "Stripe", title: "Backend Engineer", startMonth: "2018-03", endMonth: "2021-09" },
  { company: "Shopify", title: "Full Stack Developer", startMonth: "2021-01", endMonth: "2024-08" },
  { company: "Datadog", title: "Platform Engineer", startMonth: "2019-06", endMonth: "2023-10" },
  { company: "Cloudflare", title: "Systems Engineer", startMonth: "2020-04", endMonth: "2024-07" },
  { company: "Vercel", title: "Product Engineer", startMonth: "2022-01", endMonth: null },
  { company: "Linear", title: "Staff Engineer", startMonth: "2021-05", endMonth: null },
  { company: "Figma", title: "Frontend Engineer", startMonth: "2018-02", endMonth: "2022-06" },
  { company: "Notion", title: "Full Stack Engineer", startMonth: "2020-07", endMonth: "2023-12" },
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
      {
        id: makeUuid("rz-seed-candidate-work-history", (index + 1) * 10 + 1),
        company: historyA.company,
        title: historyA.title,
        startMonth: historyA.startMonth,
        endMonth: historyA.endMonth,
        currentlyWorkingHere: historyA.endMonth === null,
        sortOrder: 0,
      },
      {
        id: makeUuid("rz-seed-candidate-work-history", (index + 1) * 10 + 2),
        company: historyB.company,
        title: historyB.title,
        startMonth: historyB.startMonth,
        endMonth: historyB.endMonth,
        currentlyWorkingHere: historyB.endMonth === null,
        sortOrder: 1,
      },
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
      resumeKey: `resumes/${user.id}/seed-resume-${index + 1}.pdf`,
      bio: `${bio} Passionate about building reliable software and working with great teams.`,
      skills,
      workHistory,
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
        bio,
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
        ${profile.bio},
        ${sql.json(profile.skills)},
        ${sql.json(profile.links)}
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        onboarding_completed_at = EXCLUDED.onboarding_completed_at,
        headline = EXCLUDED.headline,
        resume_key = EXCLUDED.resume_key,
        resume_updated_at = EXCLUDED.resume_updated_at,
        bio = EXCLUDED.bio,
        skills = EXCLUDED.skills,
        links = EXCLUDED.links,
        updated_at = now()
    `;

    await sql`
      DELETE FROM candidate_work_history
      WHERE candidate_profile_id = ${profile.id}
    `;

    for (const entry of profile.workHistory) {
      await sql`
        INSERT INTO candidate_work_history (
          id,
          candidate_profile_id,
          company,
          title,
          start_month,
          end_month,
          currently_working_here,
          sort_order
        )
        VALUES (
          ${entry.id},
          ${profile.id},
          ${entry.company},
          ${entry.title},
          ${entry.startMonth},
          ${entry.endMonth},
          ${entry.currentlyWorkingHere},
          ${entry.sortOrder}
        )
        ON CONFLICT (id) DO UPDATE
        SET
          company = EXCLUDED.company,
          title = EXCLUDED.title,
          start_month = EXCLUDED.start_month,
          end_month = EXCLUDED.end_month,
          currently_working_here = EXCLUDED.currently_working_here,
          sort_order = EXCLUDED.sort_order,
          updated_at = now()
      `;
    }
  }

  console.log(`Candidate profiles seeded/upserted: ${profiles.length}`);
}

try {
  await seedCandidateProfiles();
} finally {
  await closeSql();
}
