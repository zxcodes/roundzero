// @ts-nocheck
import { closeSql, makeUuidFromSeed, pick, randomInt, sql } from "./util";

const jobTemplates = [
  { title: "Senior Full-Stack Engineer", target: 8, status: "open" },
  { title: "Frontend Engineer (React)", target: 6, status: "open" },
  { title: "Backend Engineer (Platform)", target: 7, status: "open" },
  { title: "Product Designer", target: 5, status: "open" },
  { title: "Data Engineer", target: 6, status: "open" },
  { title: "Growth Product Manager", target: 5, status: "open" },
  { title: "DevOps Engineer", target: 5, status: "draft" },
] as const;

const recommendations = ["strong_yes", "yes", "lean_no", "no"] as const;

type CompanyUser = {
  id: string;
  name: string;
};

type CandidateUser = {
  id: string;
  name: string;
  email: string;
};

type SeedJob = {
  id: string;
  title: string;
  finalReportTarget: number;
};

const buildRoleSummary = (title: string, seed: string) => {
  const focusAreas = [
    "owning ambiguous product surfaces",
    "shipping production-quality TypeScript code",
    "driving cross-functional execution",
    "debugging under real production constraints",
    "balancing speed and quality",
  ];

  return `Candidate for ${title}. Strong on ${pick(focusAreas, randomInt(`${seed}-focus`, 0, focusAreas.length - 1))}.`;
};

const makeReportScores = (seed: string, recommendation: (typeof recommendations)[number]) => {
  const base =
    recommendation === "strong_yes"
      ? 8.6
      : recommendation === "yes"
        ? 7.4
        : recommendation === "lean_no"
          ? 6.2
          : 4.8;

  const communication = Math.max(
    3.5,
    Math.min(9.5, Math.round((base + randomInt(`${seed}-comm`, -8, 6) / 10) * 10) / 10),
  );
  const problemSolving = Math.max(
    3.5,
    Math.min(9.5, Math.round((base + randomInt(`${seed}-ps`, -10, 7) / 10) * 10) / 10),
  );
  const ownership = Math.max(
    3.5,
    Math.min(9.5, Math.round((base + randomInt(`${seed}-own`, -7, 8) / 10) * 10) / 10),
  );
  const roleFit = Math.max(
    3.5,
    Math.min(9.5, Math.round((base + randomInt(`${seed}-fit`, -9, 9) / 10) * 10) / 10),
  );

  return {
    communication,
    problemSolving,
    ownership,
    roleFit,
    overall:
      Math.round(((communication + problemSolving + ownership + roleFit) / 4) * 10) / 10,
  };
};

async function ensureCompany(owner: CompanyUser) {
  const companyId = makeUuidFromSeed(`dashboard-seed-company-${owner.id}`);
  const slug = owner.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  await sql`
    INSERT INTO companies (
      id, owner_id, name, slug, onboarding_completed_at, description, logo_key,
      industry, company_size, location, website, founded_year, tech_stack, culture, social_links
    ) VALUES (
      ${companyId}, ${owner.id}, ${owner.name}, ${slug}, now(),
      ${"RoundZero seeded company for dashboard scenario testing."},
      ${`logos/${companyId}.png`},
      ${"technology"}, ${"11-50"}, ${"San Francisco, CA"},
      ${`https://${slug}.example.com`}, ${2021},
      ${sql.json(["TypeScript", "React", "Node.js", "PostgreSQL", "Cloudflare"])},
      ${"High ownership, fast shipping, strong product taste."},
      ${sql.json({ Website: `https://${slug}.example.com` })}
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      slug = EXCLUDED.slug,
      onboarding_completed_at = now(),
      updated_at = now()
  `;

  await sql`
    INSERT INTO company_members (company_id, user_id, role, status)
    VALUES (${companyId}, ${owner.id}, 'owner', 'active')
    ON CONFLICT (company_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = now()
  `;

  return companyId;
}

async function seedJobs(companyId: string) {
  const jobs: SeedJob[] = [];

  for (let i = 0; i < jobTemplates.length; i++) {
    const template = jobTemplates[i]!;
    const jobId = makeUuidFromSeed(`dashboard-seed-job-${companyId}-${i}`);

    const expiresInDays = template.status === "open" ? randomInt(`${jobId}-expires`, 4, 25) : 40;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO jobs (
        id, company_id, title, description, requirements, screening_questions, status,
        location, workplace_type, employment_type, experience_level,
        salary_min, salary_max, salary_currency, team_size, headcount, final_report_target,
        expires_at
      ) VALUES (
        ${jobId}, ${companyId}, ${template.title},
        ${`${template.title} role seeded for dashboard analytics and report workflows.`},
        ${sql.json(["Relevant production experience", "Clear communication", "Strong ownership"])},
        ${sql.json([
          "What are your salary expectations for this role?",
          "What is your notice period and earliest start date?",
          "Are you authorized to work without sponsorship?",
          "Are you open to hybrid/onsite requirements if needed?",
        ])},
        ${template.status},
        ${"San Francisco, CA"},
        ${pick(["remote", "hybrid", "onsite"] as const, i)},
        ${"full_time"},
        ${pick(["mid", "senior", "lead"] as const, i)},
        ${120000 + i * 5000},
        ${160000 + i * 7000},
        ${"USD"},
        ${randomInt(`${jobId}-team`, 4, 16)},
        ${1},
        ${template.target},
        ${expiresAt}
      )
      ON CONFLICT (id) DO UPDATE
      SET
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        final_report_target = EXCLUDED.final_report_target,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    `;

    jobs.push({ id: jobId, title: template.title, finalReportTarget: template.target });
  }

  return jobs;
}

async function seedApplicationsAndReports(companyId: string, jobs: SeedJob[], candidates: CandidateUser[]) {
  const openJobs = jobs.slice(0, 6);

  let appIndex = 0;

  for (const job of openJobs) {
    const perJobCount = randomInt(`${job.id}-apps`, 10, 16);

    for (let i = 0; i < perJobCount; i++) {
      const candidate = candidates[(appIndex + i) % candidates.length]!;
      const applicationId = makeUuidFromSeed(`dashboard-seed-app-${job.id}-${candidate.id}`);
      const createdAt = new Date(Date.now() - randomInt(`${applicationId}-created`, 2, 24) * 24 * 60 * 60 * 1000);
      const updatedAt = new Date(createdAt.getTime() + randomInt(`${applicationId}-updated`, 1, 72) * 60 * 60 * 1000);

      let status: string = "applied";
      if (i >= 2) status = "pre_screening";
      if (i >= 4) status = "interview_invited";
      if (i >= 6) status = "interview_in_progress";
      if (i >= 8) status = "evaluated";
      if (i >= 10) status = "shortlisted";
      if (i >= 12) status = "rejected";

      if (i === 8 || i === 9) {
        status = "evaluated";
      }

      await sql`
        INSERT INTO applications (id, job_id, candidate_id, resume_key, metadata, status, created_at, updated_at)
        VALUES (
          ${applicationId},
          ${job.id},
          ${candidate.id},
          ${`resumes/${candidate.id}/${applicationId}.pdf`},
          ${sql.json({
            summary: buildRoleSummary(job.title, applicationId),
            links: {
              linkedin: `https://linkedin.com/in/${candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
              github: `https://github.com/${candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
            },
          })},
          ${status},
          ${createdAt},
          ${updatedAt}
        )
        ON CONFLICT (id) DO UPDATE
        SET
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
      `;

      const needsInterview =
        status === "interview_invited" ||
        status === "interview_in_progress" ||
        status === "evaluated" ||
        status === "shortlisted" ||
        status === "rejected";

      if (needsInterview) {
        const interviewId = makeUuidFromSeed(`dashboard-seed-interview-${applicationId}`);
        const expiresAt = new Date(Date.now() + randomInt(`${interviewId}-expires`, 8, 56) * 60 * 60 * 1000);

        const interviewStatus =
          status === "interview_invited"
            ? "pending"
            : status === "interview_in_progress"
              ? "in_progress"
              : "completed";

        const startedAt =
          interviewStatus === "pending"
            ? null
            : new Date(Date.now() - randomInt(`${interviewId}-started`, 1, 96) * 60 * 60 * 1000);
        const completedAt =
          interviewStatus === "completed" && startedAt
            ? new Date(startedAt.getTime() + randomInt(`${interviewId}-dur`, 25, 75) * 60 * 1000)
            : null;

        await sql`
          INSERT INTO interviews (
            id, application_id, agent_id, type, metadata, status, started_at, completed_at, created_at, updated_at
          ) VALUES (
            ${interviewId},
            ${applicationId},
            ${`agent-${interviewId}`},
            ${"full"},
            ${sql.json({ expiresAt: expiresAt.toISOString(), preEvaluationScore: Math.round(randomInt(`${interviewId}-pre`, 55, 92)) / 10 })},
            ${interviewStatus},
            ${startedAt},
            ${completedAt},
            ${createdAt},
            ${updatedAt}
          )
          ON CONFLICT (id) DO UPDATE
          SET
            status = EXCLUDED.status,
            metadata = EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at
        `;

        if (interviewStatus === "completed") {
          const recommendation = pick(recommendations, i + appIndex);
          const scores = makeReportScores(interviewId, recommendation);
          const reportId = makeUuidFromSeed(`dashboard-seed-report-${interviewId}`);

          await sql`
            INSERT INTO reports (
              id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence,
              screening_answers, scores, recommendation, created_at
            ) VALUES (
              ${reportId},
              ${interviewId},
              ${applicationId},
              ${`${candidate.name} shows solid signal for ${job.title}.`},
              ${sql.json(["Structured communication", "Strong ownership examples"])},
              ${sql.json(["Needs deeper production scale examples"])},
              ${sql.json(["Good product intuition", "Collaborative decision-making"])} ,
              ${sql.json([
                "Candidate explained a concrete launch with measurable impact.",
                "Candidate articulated tradeoffs and fallback options.",
              ])},
              ${sql.json([
                {
                  question: "What are your salary expectations for this role?",
                  answer: "$140k-$160k base",
                  concern: "none",
                  notes: "Aligned with role range.",
                },
              ])},
              ${sql.json(scores)},
              ${recommendation},
              ${completedAt ?? updatedAt}
            )
            ON CONFLICT (interview_id) DO UPDATE
            SET
              scores = EXCLUDED.scores,
              recommendation = EXCLUDED.recommendation,
              summary = EXCLUDED.summary
          `;
        }
      }

      appIndex += 1;
    }
  }

  const ownerRows = await sql<{ ownerId: string; companyName: string }[]>`
    SELECT owner_id AS "ownerId", name AS "companyName"
    FROM companies
    WHERE id = ${companyId}
    LIMIT 1
  `;

  const owner = ownerRows[0];
  if (!owner) {
    return;
  }

  const reportRows = await sql<
    {
      applicationId: string;
      jobId: string;
      jobTitle: string;
      candidateName: string;
      score: number;
      createdAt: Date;
    }[]
  >`
    SELECT
      r.application_id AS "applicationId",
      a.job_id AS "jobId",
      j.title AS "jobTitle",
      u.name AS "candidateName",
      COALESCE((r.scores->>'overall')::float, 0) AS score,
      r.created_at AS "createdAt"
    FROM reports r
    JOIN applications a ON a.id = r.application_id
    JOIN jobs j ON j.id = a.job_id
    JOIN users u ON u.id = a.candidate_id
    WHERE j.company_id = ${companyId}
    ORDER BY r.created_at DESC
    LIMIT 16
  `;

  for (let i = 0; i < reportRows.length; i++) {
    const row = reportRows[i]!;
    await sql`
      INSERT INTO notifications (id, user_id, type, payload, read_at, created_at)
      VALUES (
        ${makeUuidFromSeed(`dashboard-seed-notification-report-ready-${row.applicationId}`)},
        ${owner.ownerId},
        ${"report_ready"},
        ${sql.json({
          applicationId: row.applicationId,
          jobId: row.jobId,
          jobTitle: row.jobTitle,
          candidateName: row.candidateName,
          score: row.score,
        })},
        ${i < 6 ? row.createdAt : null},
        ${row.createdAt}
      )
      ON CONFLICT (id) DO UPDATE
      SET
        payload = EXCLUDED.payload,
        read_at = EXCLUDED.read_at,
        created_at = EXCLUDED.created_at
    `;
  }
}

async function seedDashboardCompany() {
  const owners = await sql<CompanyUser[]>`
    SELECT id, name
    FROM users
    WHERE role = 'company'
      AND deleted_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  if (owners.length === 0) {
    throw new Error("No company user found. Create a company account first.");
  }

  const candidates = await sql<CandidateUser[]>`
    SELECT id, name, email
    FROM users
    WHERE role = 'candidate'
      AND deleted_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 40
  `;

  if (candidates.length < 12) {
    throw new Error("Need at least 12 candidate users. Create more candidate accounts first.");
  }

  const owner = owners[0]!;
  const companyId = await ensureCompany(owner);
  const jobs = await seedJobs(companyId);
  await seedApplicationsAndReports(companyId, jobs, candidates);

  console.log(`Dashboard company seed completed for owner ${owner.name}.`);
}

try {
  await seedDashboardCompany();
} finally {
  await closeSql();
}
