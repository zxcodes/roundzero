// @ts-nocheck
/**
 * RoundZero unified dev seed.
 *
 * Phase 1 — synthetic candidate pool (applicant pool for dashboard demos)
 * Phase 2 — rich company dashboard for a real dev company account
 * Phase 3 — candidate journey for a real dev candidate account
 *
 * Run:
 *   bun run db:seed
 *   bun run db:seed you@company.com
 *   bun run db:seed you@company.com you@candidate.com
 *
 * Requires: sign up in dev mode first. Company and/or candidate phases skip
 * gracefully when the matching account is missing.
 */
import {
  buildCommunicationAnalysis,
  buildInterviewChatMessages,
  buildReportContent,
  buildRoleSummary,
  buildVoiceTranscriptMessages,
  makeScoresFromOverall,
  spreadScores,
} from "./demo-data";
import {
  closeSql,
  copycat,
  loadDevUser,
  makeUuid,
  makeUuidFromSeed,
  randomInt,
  sql,
} from "./util";

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

type ApplicantStatus =
  | "applied"
  | "pre_screening"
  | "queued_for_batch"
  | "interview_invited"
  | "interview_in_progress"
  | "evaluated_held"
  | "evaluated"
  | "shortlisted"
  | "rejected";

type ApplicantPlan = {
  status: ApplicantStatus;
  overallScore?: number;
  releaseReport?: boolean;
};

type ApplicationSeedContext = {
  job: SeedJob;
  jobTitle: string;
  candidate: CandidateUser;
  plan: ApplicantPlan;
  applicationId: string;
  interviewId: string;
  index: number;
  batchId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const DEV_CANDIDATE_RESUME_KEY =
  "resumes/8e32773d-d9d8-4eb7-997f-d91a3c8d52d9/a2a64299-e9c3-4294-b929-9099b2d6757a--mohammed-farmaan.pdf";

const jobTemplates = [
  {
    title: "Senior Full-Stack Engineer",
    target: 8,
    status: "open",
    workplace: "remote",
    experience: "senior",
    salaryMin: 155000,
    salaryMax: 205000,
    reportCount: 9,
    description:
      "Own end-to-end product features across our React/TypeScript frontend and Node.js/PostgreSQL backend. You'll partner with design and product on customer-facing workflows, mentor mid-level engineers, and help raise the bar on reliability and delivery speed.",
  },
  {
    title: "Frontend Engineer (React)",
    target: 6,
    status: "open",
    workplace: "hybrid",
    experience: "mid",
    salaryMin: 130000,
    salaryMax: 175000,
    reportCount: 8,
    description:
      "Ship polished, accessible interfaces with React, TypeScript, and Tailwind. You'll own UI quality for high-traffic surfaces, contribute to our component library, and collaborate closely with design on rapid iteration.",
  },
  {
    title: "Backend Engineer (Platform)",
    target: 7,
    status: "open",
    workplace: "remote",
    experience: "senior",
    salaryMin: 150000,
    salaryMax: 195000,
    reportCount: 8,
    activeBatch: true,
    heldCount: 3,
    description:
      "Design and operate scalable APIs, background jobs, and data pipelines powering RoundZero's interview and evaluation platform. Strong PostgreSQL and observability experience required.",
  },
  {
    title: "Product Designer",
    target: 5,
    status: "open",
    workplace: "hybrid",
    experience: "mid",
    salaryMin: 125000,
    salaryMax: 165000,
    reportCount: 7,
    description:
      "Lead UX for hiring workflows used by recruiters and candidates daily. From research and wireframes through high-fidelity Figma — partner with PM and engineering to ship intuitive, trustworthy experiences.",
  },
  {
    title: "Data Engineer",
    target: 6,
    status: "open",
    workplace: "remote",
    experience: "senior",
    salaryMin: 145000,
    salaryMax: 190000,
    reportCount: 8,
    description:
      "Build reliable analytics pipelines and reporting infrastructure. You'll model hiring funnel data, improve data quality, and enable product and GTM teams with trustworthy metrics.",
  },
  {
    title: "Growth Product Manager",
    target: 5,
    status: "open",
    workplace: "onsite",
    experience: "mid",
    salaryMin: 135000,
    salaryMax: 180000,
    reportCount: 7,
    description:
      "Drive activation and retention across self-serve and sales-assisted motions. Own experiment design, funnel analysis, and cross-functional execution with engineering and design.",
  },
  {
    title: "DevOps Engineer",
    target: 5,
    status: "draft",
    workplace: "onsite",
    experience: "senior",
    salaryMin: 140000,
    salaryMax: 185000,
    reportCount: 0,
    description:
      "Own CI/CD, infrastructure as code, and production observability on Cloudflare Workers and AWS. Lead incident response and cost-efficiency initiatives as we scale.",
  },
] as const;

const screeningQuestions = [
  "What are your salary expectations for this role?",
  "What is your notice period and earliest start date?",
  "Are you authorized to work without sponsorship?",
  "Are you open to hybrid/onsite requirements if needed?",
];

const demoCompanyProfile = {
  name: "RoundZero",
  description:
    "RoundZero helps teams evaluate every applicant with AI interviews — delivering ranked candidates, structured reports, and evidence-backed recommendations before the first human interview.",
  industry: "technology",
  companySize: "11-50",
  location: "San Francisco, CA",
  website: "https://roundzero.dev",
  foundedYear: 2022,
  techStack: ["TypeScript", "React", "Node.js", "PostgreSQL", "Cloudflare Workers"],
  culture:
    "High ownership, fast shipping, strong product taste. We bias toward clarity, measurable outcomes, and respectful candidate experiences.",
  socialLinks: {
    Website: "https://roundzero.dev",
    LinkedIn: "https://linkedin.com/company/roundzero",
  },
} as const;

const candidateStatusNotifications = new Set([
  "interview_invited",
  "shortlisted",
  "rejected",
  "evaluated",
]);

function buildApplicantPlans(reportCount: number, heldCount = 0): ApplicantPlan[] {
  const earlyPipeline: ApplicantPlan[] = [
    { status: "applied" },
    { status: "applied" },
    { status: "pre_screening" },
    { status: "pre_screening" },
    { status: "queued_for_batch" },
    { status: "interview_invited" },
    { status: "interview_in_progress" },
  ];

  const releasedScores = spreadScores(reportCount);
  const heldScores = spreadScores(heldCount, 7.8, 6.8);

  const heldPlans: ApplicantPlan[] = heldScores.map((overallScore) => ({
    status: "evaluated_held",
    overallScore,
    releaseReport: false,
  }));

  const reportPlans: ApplicantPlan[] = releasedScores.map((overallScore, index) => {
    let status: ApplicantStatus = "evaluated";
    // Keep the top-ranked report in "evaluated" so the report page shows the
    // primary Shortlist action; shortlist the runner-up for the Shortlisted inbox.
    if (index === 1) status = "shortlisted";
    if (index >= releasedScores.length - 2) status = "rejected";

    return {
      status,
      overallScore,
      releaseReport: true,
    };
  });

  return [...earlyPipeline, ...heldPlans, ...reportPlans];
}

function interviewStatusForApplication(status: ApplicantStatus) {
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

function clampPreScore(index: number, status: ApplicantStatus) {
  const base = status === "interview_invited" ? 6.8 : status === "interview_in_progress" ? 7.2 : 7.5;
  return Math.round((base + (index % 4) * 0.15) * 10) / 10;
}

function parseEmailArgs() {
  const emails = process.argv.slice(2).filter((arg) => arg.includes("@"));
  return {
    companyEmail: emails.find((_, index) => index === 0) ?? undefined,
    candidateEmail: emails.find((_, index) => index === 1) ?? undefined,
  };
}

// ─── Phase 1: synthetic candidate pool ─────────────────────────────

const syntheticCandidateProfiles = [
  { name: "Sarah Chen", picture: "https://i.pravatar.cc/300?img=47" },
  { name: "Marcus Johnson", picture: "https://i.pravatar.cc/300?img=33" },
  { name: "Priya Patel", picture: "https://i.pravatar.cc/300?img=45" },
  { name: "James Okonkwo", picture: "https://i.pravatar.cc/300?img=12" },
  { name: "Emily Rodriguez", picture: "https://i.pravatar.cc/300?img=9" },
  { name: "David Kim", picture: "https://i.pravatar.cc/300?img=15" },
  { name: "Aisha Rahman", picture: "https://i.pravatar.cc/300?img=48" },
  { name: "Michael Torres", picture: "https://i.pravatar.cc/300?img=13" },
  { name: "Hannah Nguyen", picture: "https://i.pravatar.cc/300?img=44" },
  { name: "Chris Anderson", picture: "https://i.pravatar.cc/300?img=7" },
  { name: "Olivia Bennett", picture: "https://i.pravatar.cc/300?img=31" },
  { name: "Raj Mehta", picture: "https://i.pravatar.cc/300?img=14" },
  { name: "Sophie Laurent", picture: "https://i.pravatar.cc/300?img=38" },
  { name: "Daniel Brooks", picture: "https://i.pravatar.cc/300?img=11" },
  { name: "Maya Williams", picture: "https://i.pravatar.cc/300?img=49" },
  { name: "Kevin Okafor", picture: "https://i.pravatar.cc/300?img=52" },
  { name: "Jessica Park", picture: "https://i.pravatar.cc/300?img=32" },
  { name: "Alex Morgan", picture: "https://i.pravatar.cc/300?img=60" },
  { name: "Nina Kowalski", picture: "https://i.pravatar.cc/300?img=36" },
  { name: "Ryan Sullivan", picture: "https://i.pravatar.cc/300?img=8" },
] as const;

async function seedSyntheticCandidates() {
  const candidates: Array<{
    id: string;
    email: string;
    name: string;
    picture: string;
    role: "candidate";
    googleId: string;
  }> = [];

  for (let i = 0; i < syntheticCandidateProfiles.length; i++) {
    const profile = syntheticCandidateProfiles[i]!;
    const index = i + 1;
    const id = makeUuid("rz-seed-candidate-user", index);
    const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, ".");

    candidates.push({
      id,
      email: `${slug}${index}@gmail.com`,
      name: profile.name,
      picture: profile.picture,
      role: "candidate",
      googleId: `rz-seed-candidate-google-${index}`,
    });
  }

  for (const user of candidates) {
    await sql`
      INSERT INTO users (id, email, name, picture, role, google_id)
      VALUES (${user.id}, ${user.email}, ${user.name}, ${user.picture}, ${user.role}, ${user.googleId})
      ON CONFLICT (id) DO UPDATE
      SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        picture = EXCLUDED.picture,
        role = EXCLUDED.role,
        google_id = EXCLUDED.google_id,
        updated_at = now()
    `;
  }

  for (let i = 0; i < candidates.length; i++) {
    const user = candidates[i]!;

    await sql`
      INSERT INTO candidate_profiles (
        id, user_id, onboarding_completed_at, resume_key, resume_updated_at
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

  console.log(`  Synthetic candidates: ${candidates.length}`);
}

// ─── Shared seed helpers ───────────────────────────────────────────

async function upsertCompanyProfile(companyId: string, ownerId: string, slug: string) {
  await sql`
    INSERT INTO companies (
      id, owner_id, name, slug, onboarding_completed_at, description, logo_key,
      industry, company_size, location, website, founded_year, tech_stack, culture, social_links
    ) VALUES (
      ${companyId}, ${ownerId}, ${demoCompanyProfile.name}, ${slug}, now(),
      ${demoCompanyProfile.description},
      ${`logos/${companyId}.png`},
      ${demoCompanyProfile.industry}, ${demoCompanyProfile.companySize}, ${demoCompanyProfile.location},
      ${demoCompanyProfile.website}, ${demoCompanyProfile.foundedYear},
      ${sql.json(demoCompanyProfile.techStack)},
      ${demoCompanyProfile.culture},
      ${sql.json(demoCompanyProfile.socialLinks)}
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      onboarding_completed_at = now(),
      industry = EXCLUDED.industry,
      company_size = EXCLUDED.company_size,
      location = EXCLUDED.location,
      website = EXCLUDED.website,
      founded_year = EXCLUDED.founded_year,
      tech_stack = EXCLUDED.tech_stack,
      culture = EXCLUDED.culture,
      social_links = EXCLUDED.social_links,
      updated_at = now()
  `;
}

async function ensureCompany(owner: { id: string }) {
  const companyId = makeUuidFromSeed(`seed-me-company-${owner.id}`);
  const slug = "round-zero";

  await upsertCompanyProfile(companyId, owner.id, slug);

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

    const expiresInDays = template.status === "open" ? randomInt(`${jobId}-expires`, 8, 28) : 45;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO jobs (
        id, company_id, title, description, requirements, screening_questions, status,
        location, workplace_type, employment_type, experience_level,
        salary_min, salary_max, salary_currency, team_size, headcount, final_report_target,
        expires_at
      ) VALUES (
        ${jobId}, ${companyId}, ${template.title},
        ${template.description},
        ${sql.json([
          "Relevant production experience in a similar stack",
          "Clear written and verbal communication",
          "Demonstrated ownership from design through rollout",
          "Comfort operating with ambiguity and tight feedback loops",
        ])},
        ${sql.json(screeningQuestions)},
        ${template.status},
        ${template.workplace === "remote" ? "Remote (US timezones)" : "San Francisco, CA"},
        ${template.workplace},
        ${"full_time"},
        ${template.experience},
        ${template.salaryMin},
        ${template.salaryMax},
        ${"USD"},
        ${randomInt(`${jobId}-team`, 5, 14)},
        ${1},
        ${template.target},
        ${expiresAt}
      )
      ON CONFLICT (id) DO UPDATE
      SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        final_report_target = EXCLUDED.final_report_target,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    `;

    jobs.push({ id: jobId, title: template.title, finalReportTarget: template.target });
  }

  return jobs;
}

async function seedInterviewMessages(
  interviewId: string,
  candidateName: string,
  jobTitle: string,
  index: number,
) {
  await sql`DELETE FROM interview_messages WHERE interview_id = ${interviewId}`;

  const messages = buildInterviewChatMessages({ candidateName, jobTitle, index });
  for (const message of messages) {
    await sql`
      INSERT INTO interview_messages (interview_id, role, content)
      VALUES (${interviewId}, ${message.role}, ${message.content})
    `;
  }
}

async function seedVoiceAssessment(
  interviewId: string,
  applicationId: string,
  candidateName: string,
  jobTitle: string,
  overallScore: number,
  index: number,
  completedAt: Date,
) {
  const transcriptInput = { candidateName, jobTitle, index };
  const transcript = buildVoiceTranscriptMessages(transcriptInput);
  const analysis = buildCommunicationAnalysis(overallScore, transcriptInput);
  const assessmentId = makeUuidFromSeed(`seed-voice-assessment-${interviewId}`);

  await sql`
    INSERT INTO communication_assessments (
      id, interview_id, application_id, status, transcript, analysis,
      started_at, completed_at, created_at, updated_at
    )
    VALUES (
      ${assessmentId},
      ${interviewId},
      ${applicationId},
      ${"completed"},
      ${sql.json(transcript)},
      ${sql.json(analysis)},
      ${new Date(completedAt.getTime() - 8 * 60 * 1000)},
      ${completedAt},
      ${completedAt},
      ${completedAt}
    )
    ON CONFLICT (interview_id) DO UPDATE
    SET
      status = EXCLUDED.status,
      transcript = EXCLUDED.transcript,
      analysis = EXCLUDED.analysis,
      started_at = EXCLUDED.started_at,
      completed_at = EXCLUDED.completed_at,
      updated_at = now()
  `;
}

async function seedApplicationPipeline(ctx: ApplicationSeedContext) {
  const { plan, candidate, job, applicationId, interviewId, index, batchId, createdAt, updatedAt } =
    ctx;

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
      ${plan.status},
      ${createdAt},
      ${updatedAt}
    )
    ON CONFLICT (id) DO UPDATE
    SET
      status = EXCLUDED.status,
      metadata = EXCLUDED.metadata,
      updated_at = EXCLUDED.updated_at
  `;

  if (plan.status !== "applied" && plan.status !== "pre_screening" && plan.status !== "queued_for_batch") {
    const preScore = plan.overallScore ?? clampPreScore(index, plan.status);
    await sql`
      INSERT INTO pre_evaluations (
        id, application_id, score, missing_requirements, confidence, next_step, model, prompt_version
      )
      VALUES (
        ${makeUuidFromSeed(`dashboard-seed-pre-eval-${applicationId}`)},
        ${applicationId},
        ${preScore},
        ${sql.json(preScore >= 7 ? [] : ["Needs stronger production examples at scale"])},
        ${preScore >= 8 ? "high" : preScore >= 6 ? "medium" : "low"},
        ${preScore >= 7 ? "invite_to_interview" : "manual_review"},
        ${"seed/demo"},
        ${"1.0.0"}
      )
      ON CONFLICT (application_id) DO UPDATE
      SET score = EXCLUDED.score,
          missing_requirements = EXCLUDED.missing_requirements,
          confidence = EXCLUDED.confidence,
          next_step = EXCLUDED.next_step
    `;
  }

  const interviewStatus = interviewStatusForApplication(plan.status);
  if (!interviewStatus) {
    return;
  }

  const expiresAt = new Date(Date.now() + randomInt(`${interviewId}-expires`, 12, 72) * 60 * 60 * 1000);
  const invitedAt =
    interviewStatus === "pending"
      ? new Date(Date.now() - randomInt(`${interviewId}-invited`, 6, 48) * 60 * 60 * 1000)
      : new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000);
  const startedAt =
    interviewStatus === "pending"
      ? null
      : new Date(Date.now() - randomInt(`${interviewId}-started`, 4, 120) * 60 * 60 * 1000);
  const completedAt =
    interviewStatus === "completed" && startedAt
      ? new Date(startedAt.getTime() + randomInt(`${interviewId}-dur`, 28, 68) * 60 * 1000)
      : null;

  const linkToBatch = batchId !== null && interviewStatus === "completed";

  await sql`
    INSERT INTO interviews (
      id, application_id, batch_id, agent_id, type, metadata, status,
      invited_at, started_at, completed_at, created_at, updated_at
    ) VALUES (
      ${interviewId},
      ${applicationId},
      ${linkToBatch ? batchId : null},
      ${interviewStatus === "pending" ? null : `agent-${interviewId}`},
      ${"full"},
      ${sql.json({
        expiresAt: expiresAt.toISOString(),
      })},
      ${interviewStatus},
      ${invitedAt},
      ${startedAt},
      ${completedAt},
      ${createdAt},
      ${updatedAt}
    )
    ON CONFLICT (id) DO UPDATE
    SET
      batch_id = EXCLUDED.batch_id,
      status = EXCLUDED.status,
      metadata = EXCLUDED.metadata,
      invited_at = EXCLUDED.invited_at,
      started_at = EXCLUDED.started_at,
      completed_at = EXCLUDED.completed_at,
      updated_at = EXCLUDED.updated_at
  `;

  if (interviewStatus === "in_progress") {
    await seedInterviewMessages(interviewId, candidate.name, job.title, index);
    return;
  }

  if (interviewStatus !== "completed" || plan.overallScore === undefined || !completedAt) {
    return;
  }

  await seedInterviewMessages(interviewId, candidate.name, job.title, index);
  await seedVoiceAssessment(
    interviewId,
    applicationId,
    candidate.name,
    job.title,
    plan.overallScore,
    index,
    completedAt,
  );

  const reportContent = buildReportContent({
    candidateName: candidate.name,
    jobTitle: job.title,
    overall: plan.overallScore,
    index,
  });
  const scores = makeScoresFromOverall(plan.overallScore, interviewId);
  const reportId = makeUuidFromSeed(`dashboard-seed-report-${interviewId}`);
  const releasedAt = plan.releaseReport
    ? new Date(
        completedAt.getTime() + randomInt(`${reportId}-released`, 30, 180) * 60 * 1000,
      )
    : null;

  await sql`
    INSERT INTO reports (
      id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence,
      screening_answers, scores, recommendation, model, prompt_version, refine_version,
      released_at, created_at
    ) VALUES (
      ${reportId},
      ${interviewId},
      ${applicationId},
      ${reportContent.summary},
      ${sql.json(reportContent.strengths)},
      ${sql.json(reportContent.weaknesses)},
      ${sql.json(reportContent.insights)},
      ${sql.json(reportContent.evidence)},
      ${sql.json(reportContent.screeningAnswers)},
      ${sql.json(scores)},
      ${reportContent.recommendation},
      ${"seed/demo"},
      ${"1.0.0"},
      ${"1.0.0"},
      ${releasedAt},
      ${completedAt}
    )
    ON CONFLICT (interview_id) DO UPDATE
    SET
      scores = EXCLUDED.scores,
      recommendation = EXCLUDED.recommendation,
      summary = EXCLUDED.summary,
      strengths = EXCLUDED.strengths,
      weaknesses = EXCLUDED.weaknesses,
      insights = EXCLUDED.insights,
      evidence = EXCLUDED.evidence,
      screening_answers = EXCLUDED.screening_answers,
      released_at = EXCLUDED.released_at
  `;
}

async function seedCompanyReportNotifications(companyId: string) {
  const ownerRows = await sql<{ ownerId: string }[]>`
    SELECT owner_id AS "ownerId"
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
      COALESCE(r.released_at, r.created_at) AS "createdAt"
    FROM reports r
    JOIN applications a ON a.id = r.application_id
    JOIN jobs j ON j.id = a.job_id
    JOIN users u ON u.id = a.candidate_id
    WHERE j.company_id = ${companyId}
      AND r.released_at IS NOT NULL
    ORDER BY r.released_at DESC
    LIMIT 20
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
        ${i < 5 ? row.createdAt : null},
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

async function seedApplicationsAndReports(
  companyId: string,
  jobs: SeedJob[],
  candidates: CandidateUser[],
) {
  const openJobs = jobs.filter((_, index) => jobTemplates[index]?.status === "open");

  let candidateOffset = 0;

  for (let jobIndex = 0; jobIndex < openJobs.length; jobIndex++) {
    const job = openJobs[jobIndex]!;
    const template = jobTemplates[jobIndex]!;
    const heldCount = template.heldCount ?? 0;
    const plans = buildApplicantPlans(template.reportCount, heldCount);

    let batchId: string | null = null;
    if (template.reportCount > 0 || template.activeBatch) {
      batchId = makeUuidFromSeed(`dashboard-seed-batch-${job.id}`);
      const batchStatus = template.activeBatch ? "active" : "released";
      const launchedAt = new Date(
        Date.now() - (template.activeBatch ? 2 : 10) * 24 * 60 * 60 * 1000,
      );
      const releasedAt = template.activeBatch
        ? null
        : new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      await sql`
        INSERT INTO job_batches (id, job_id, status, target_size, launched_at, released_at)
        VALUES (
          ${batchId},
          ${job.id},
          ${batchStatus},
          ${template.target},
          ${launchedAt},
          ${releasedAt}
        )
        ON CONFLICT (id) DO UPDATE
        SET status = EXCLUDED.status,
            target_size = EXCLUDED.target_size,
            launched_at = EXCLUDED.launched_at,
            released_at = EXCLUDED.released_at
      `;
    }

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i]!;
      const candidate = candidates[(candidateOffset + i) % candidates.length]!;
      const applicationId = makeUuidFromSeed(`dashboard-seed-app-${job.id}-${i}-${candidate.id}`);
      const createdAt = new Date(
        Date.now() - randomInt(`${applicationId}-created`, 3, 21) * 24 * 60 * 60 * 1000,
      );
      const updatedAt = new Date(
        createdAt.getTime() + randomInt(`${applicationId}-updated`, 2, 96) * 60 * 60 * 1000,
      );

      await seedApplicationPipeline({
        job,
        jobTitle: job.title,
        candidate,
        plan,
        applicationId,
        interviewId: makeUuidFromSeed(`dashboard-seed-interview-${applicationId}`),
        index: candidateOffset + i,
        batchId,
        createdAt,
        updatedAt,
      });
    }

    candidateOffset += plans.length;
  }

  await seedCompanyReportNotifications(companyId);
}

async function loadApplicantPool() {
  const seededCandidates = await sql<CandidateUser[]>`
    SELECT id, name, email
    FROM users
    WHERE role = 'candidate'
      AND deleted_at IS NULL
      AND google_id LIKE 'rz-seed-candidate-google-%'
    ORDER BY created_at ASC
    LIMIT 40
  `;

  if (seededCandidates.length >= 20) {
    return seededCandidates;
  }

  return sql<CandidateUser[]>`
    SELECT id, name, email
    FROM users
    WHERE role = 'candidate'
      AND deleted_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 40
  `;
}

// ─── Phase 2: company dashboard ────────────────────────────────────

async function seedCompanyDashboard(companyEmail?: string) {
  const owner = await loadDevUser("company", companyEmail);

  if (!owner) {
    if (companyEmail) {
      throw new Error(`No company user found for ${companyEmail}. Sign up as company in dev mode first.`);
    }
    console.log("  Company dashboard: skipped (no dev company user)");
    return null;
  }

  const candidates = await loadApplicantPool();
  if (candidates.length < 12) {
    throw new Error("Need at least 12 candidate users for the applicant pool.");
  }

  const companyId = await ensureCompany(owner);
  const jobs = await seedJobs(companyId);
  await seedApplicationsAndReports(companyId, jobs, candidates);

  console.log(`  Company dashboard: ${owner.name} <${owner.email}>`);
  return { companyId, jobs, owner };
}

// ─── Phase 3: dev candidate journey ────────────────────────────────

async function seedCandidateNotification(input: {
  applicationId: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: ApplicantStatus;
  updatedAt: Date;
  index: number;
}) {
  if (!candidateStatusNotifications.has(input.status)) {
    return;
  }

  await sql`
    INSERT INTO notifications (id, user_id, type, payload, read_at, created_at)
    VALUES (
      ${makeUuidFromSeed(`seed-candidate-notification-${input.applicationId}`)},
      ${input.candidateId},
      ${"application_status_changed"},
      ${sql.json({
        applicationId: input.applicationId,
        jobId: input.jobId,
        jobTitle: input.jobTitle,
        companyName: input.companyName,
        status: input.status,
      })},
      ${input.index % 2 === 0 ? input.updatedAt : null},
      ${input.updatedAt}
    )
    ON CONFLICT (id) DO UPDATE
    SET
      payload = EXCLUDED.payload,
      read_at = EXCLUDED.read_at,
      created_at = EXCLUDED.created_at
  `;
}

async function seedDevCandidate(
  candidateEmail: string | undefined,
  companyContext: Awaited<ReturnType<typeof seedCompanyDashboard>>,
) {
  const candidate = await loadDevUser("candidate", candidateEmail);

  if (!candidate) {
    if (candidateEmail) {
      throw new Error(
        `No candidate user found for ${candidateEmail}. Sign up as candidate in dev mode first.`,
      );
    }
    console.log("  Dev candidate journey: skipped (no dev candidate user)");
    return;
  }

  await sql`
    INSERT INTO candidate_profiles (
      id, user_id, onboarding_completed_at, resume_key, resume_updated_at
    )
    VALUES (
      ${makeUuidFromSeed(`seed-dev-profile-${candidate.id}`)},
      ${candidate.id},
      now(),
      ${DEV_CANDIDATE_RESUME_KEY},
      now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      resume_key = EXCLUDED.resume_key,
      resume_updated_at = now(),
      onboarding_completed_at = now(),
      updated_at = now()
  `;

  if (!companyContext) {
    console.log(`  Dev candidate profile: ${candidate.name} <${candidate.email}> (no company jobs to apply to)`);
    return;
  }

  const { companyId, jobs } = companyContext;
  const openJobs = jobs.filter((_, index) => jobTemplates[index]?.status === "open");
  if (openJobs.length < 5) {
    console.log(`  Dev candidate profile: ${candidate.name} <${candidate.email}> (insufficient open jobs)`);
    return;
  }

  const devPlans: Array<{ jobIndex: number; plan: ApplicantPlan }> = [
    { jobIndex: 0, plan: { status: "applied" } },
    { jobIndex: 1, plan: { status: "interview_invited" } },
    { jobIndex: 2, plan: { status: "interview_in_progress" } },
    { jobIndex: 3, plan: { status: "shortlisted", overallScore: 8.2, releaseReport: true } },
    { jobIndex: 4, plan: { status: "evaluated", overallScore: 7.1, releaseReport: true } },
  ];

  const candidateUser: CandidateUser = {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
  };

  for (let i = 0; i < devPlans.length; i++) {
    const { jobIndex, plan } = devPlans[i]!;
    const job = openJobs[jobIndex]!;
    const applicationId = makeUuidFromSeed(`seed-dev-app-${candidate.id}-${job.id}`);
    const createdAt = new Date(Date.now() - (devPlans.length - i) * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + 6 * 60 * 60 * 1000);

    await seedApplicationPipeline({
      job,
      jobTitle: job.title,
      candidate: candidateUser,
      plan,
      applicationId,
      interviewId: makeUuidFromSeed(`seed-dev-interview-${applicationId}`),
      index: i + 100,
      batchId: null,
      createdAt,
      updatedAt,
    });

    await seedCandidateNotification({
      applicationId,
      candidateId: candidate.id,
      jobId: job.id,
      jobTitle: job.title,
      companyName: demoCompanyProfile.name,
      status: plan.status,
      updatedAt,
      index: i,
    });
  }

  console.log(`  Dev candidate journey: ${candidate.name} <${candidate.email}> (${devPlans.length} applications)`);
}

// ─── Main ──────────────────────────────────────────────────────────

const { companyEmail, candidateEmail } = parseEmailArgs();

try {
  console.log("Starting RoundZero seed...\n");

  console.log("Phase 1 — synthetic candidate pool");
  await seedSyntheticCandidates();

  console.log("\nPhase 2 — company dashboard");
  const companyContext = await seedCompanyDashboard(companyEmail);

  console.log("\nPhase 3 — dev candidate journey");
  await seedDevCandidate(candidateEmail, companyContext);

  console.log("\nSeed completed successfully.");
} catch (error) {
  console.error("\nSeed failed:", error);
  process.exit(1);
} finally {
  await closeSql();
}