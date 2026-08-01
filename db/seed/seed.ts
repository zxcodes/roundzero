// @ts-nocheck
/**
 * RoundZero unified dev seed.
 *
 * Phase 1 — synthetic candidate pool (applicant pool for dashboard demos)
 * Phase 2 — rich company dashboard for a real dev company account
 *
 * Run:
 *   bun run db:seed
 *   bun run db:seed you@company.com
 *
 * Requires: sign up in dev mode first. The company phase skips gracefully
 * when the matching account is missing. Candidate accounts are never mutated.
 */
import { MATCHING_CONFIG } from "../../app/features/job-matching/config";
import { hashStableValue } from "../../app/features/job-matching/hash";

import {
  buildCommunicationAnalysis,
  buildInterviewChatMessages,
  buildReportContent,
  buildRoleSummary,
  buildVoiceTranscriptMessages,
  makeScoresFromOverall,
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
  interviewStatus?: "pending" | "in_progress" | "awaiting_voice" | "completed";
  overallScore?: number;
  reportState?: "held" | "released";
  batch?: "active" | "released";
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

const jobTemplates = [
  {
    title: "Senior Full-Stack Engineer",
    target: 4,
    status: "open",
    workplace: "remote",
    experience: "senior",
    salaryMin: 155000,
    salaryMax: 205000,
    requirements: [
      "6+ years building production web applications across frontend and backend systems",
      "Advanced experience with React, TypeScript, Node.js, and relational databases",
      "A track record of owning features from technical design through production monitoring",
      "Experience designing APIs, data models, and asynchronous workflows",
      "Strong product judgment and clear written communication in a remote environment",
      "Comfort mentoring engineers and improving team-wide engineering practices",
    ],
    plans: [
      {
        status: "evaluated",
        interviewStatus: "completed",
        overallScore: 8.8,
        reportState: "released",
        batch: "released",
      },
      { status: "interview_in_progress", interviewStatus: "completed", batch: "active" },
      { status: "interview_invited", interviewStatus: "pending", batch: "active" },
      {
        status: "interview_in_progress",
        interviewStatus: "awaiting_voice",
        batch: "active",
      },
      { status: "queued_for_batch" },
      { status: "queued_for_batch" },
    ] satisfies ApplicantPlan[],
    description: `RoundZero is building a hiring platform that helps teams evaluate applicants consistently without losing the human context behind each decision. As a Senior Full-Stack Engineer, you will own high-impact product areas used by recruiters, hiring managers, and candidates throughout the interview process.

You will design and ship end-to-end features across our React and TypeScript frontend, Node.js services, PostgreSQL data layer, and asynchronous workflows. Recent projects include real-time interview experiences, evidence-backed candidate reports, job matching, notification systems, and tools that help recruiting teams move from hundreds of applicants to a confident shortlist.

This is a senior individual-contributor role with meaningful product influence. You will work directly with design and product, write technical proposals, review architecture, mentor teammates, and stay close to production through observability and customer feedback.`,
  },
  {
    title: "Frontend Engineer",
    target: 3,
    status: "open",
    workplace: "hybrid",
    experience: "mid",
    salaryMin: 130000,
    salaryMax: 175000,
    requirements: [
      "3+ years building polished production interfaces with React and TypeScript",
      "Strong command of semantic HTML, modern CSS, responsive design, and accessibility",
      "Experience contributing to a shared component library or design system",
      "Ability to translate product and design intent into maintainable UI architecture",
      "Familiarity with frontend testing, performance profiling, and browser debugging",
      "Clear communication and comfort collaborating through design and code reviews",
    ],
    plans: [
      {
        status: "evaluated",
        interviewStatus: "completed",
        overallScore: 8.4,
        reportState: "released",
        batch: "released",
      },
      { status: "interview_invited", interviewStatus: "pending", batch: "active" },
      { status: "interview_in_progress", interviewStatus: "in_progress", batch: "active" },
      { status: "queued_for_batch" },
      { status: "queued_for_batch" },
    ] satisfies ApplicantPlan[],
    description: `The candidate and recruiter experience is the product at RoundZero. We are looking for a Frontend Engineer who cares about the details that make complex hiring workflows feel calm, fast, and trustworthy.

You will build responsive React and TypeScript interfaces for interview setup, candidate communication, evaluation reports, job discovery, and team collaboration. You will also strengthen our design system, accessibility coverage, loading states, and performance across both public pages and authenticated dashboards.

You will partner closely with product design from early prototypes through implementation. The role is a good fit for someone who can reason about component boundaries and data states while still noticing typography, interaction feedback, keyboard behavior, and the final few pixels that make an experience feel finished.`,
  },
  {
    title: "Backend Engineer",
    target: 3,
    status: "open",
    workplace: "remote",
    experience: "senior",
    salaryMin: 150000,
    salaryMax: 195000,
    requirements: [
      "5+ years building and operating backend services in a production environment",
      "Strong experience with TypeScript or another typed server-side language",
      "Deep knowledge of PostgreSQL schema design, transactions, indexing, and query performance",
      "Experience with queues, durable workflows, retries, idempotency, and distributed systems",
      "Ability to design secure APIs and reason about authorization and data lifecycle concerns",
      "Practical experience with observability, incident response, and production debugging",
    ],
    plans: [
      {
        status: "evaluated",
        interviewStatus: "completed",
        overallScore: 8.5,
        reportState: "released",
        batch: "released",
      },
      { status: "interview_invited", interviewStatus: "pending" },
      { status: "interview_in_progress", interviewStatus: "awaiting_voice" },
      { status: "queued_for_batch" },
      { status: "queued_for_batch" },
    ] satisfies ApplicantPlan[],
    description: `RoundZero coordinates long-running interview, evaluation, reporting, and notification workflows where correctness matters as much as speed. We are hiring a Backend Engineer to make those systems dependable as usage and product complexity grow.

You will design APIs and data models, build durable asynchronous workflows, improve query performance, and establish clear failure-recovery paths across the platform. The work spans PostgreSQL, Cloudflare Workers, queues, object storage, third-party AI providers, email delivery, and the internal services that connect them.

You will collaborate with product engineers on system boundaries and lead technical work involving idempotency, authorization, privacy, observability, and operational tooling. You should enjoy turning ambiguous reliability problems into simple systems that other engineers can confidently build on.`,
  },
  {
    title: "Product Designer",
    target: 2,
    status: "open",
    workplace: "hybrid",
    experience: "mid",
    salaryMin: 125000,
    salaryMax: 165000,
    requirements: [
      "4+ years designing B2B or workflow-heavy software products",
      "A portfolio showing strong interaction design, systems thinking, and visual craft",
      "Experience planning and conducting user interviews or usability studies",
      "Ability to move between journey maps, prototypes, detailed UI, and implementation review",
      "Fluency with Figma components, variables, prototyping, and design-system workflows",
      "Clear written rationale and comfort working closely with engineers and product leaders",
    ],
    plans: [
      {
        status: "evaluated",
        interviewStatus: "completed",
        overallScore: 8.2,
        reportState: "released",
        batch: "released",
      },
      { status: "interview_invited", interviewStatus: "pending" },
      { status: "queued_for_batch" },
    ] satisfies ApplicantPlan[],
    description: `Hiring software often asks people to manage deeply human decisions through interfaces that feel like spreadsheets. RoundZero is looking for a Product Designer to make those workflows clearer, more considered, and easier to trust for both recruiting teams and candidates.

You will lead design across discovery, user research, journey mapping, prototypes, and production-ready interface specifications. Initial areas include job setup, applicant triage, interview progress, candidate reports, matching explanations, and the collaboration patterns teams use to reach a hiring decision.

You will work in a tight product trio with engineering and product, validate ideas with customers, and contribute reusable patterns to our design system. We value designers who can simplify complicated states without hiding important information and who stay involved through implementation rather than stopping at handoff.`,
  },
  {
    title: "Data Engineer",
    target: 4,
    status: "open",
    workplace: "remote",
    experience: "senior",
    salaryMin: 145000,
    salaryMax: 190000,
    requirements: [
      "5+ years building production data pipelines, models, or analytics infrastructure",
      "Advanced SQL skills and experience with a modern warehouse or analytical database",
      "Experience designing reliable batch and event-driven ingestion workflows",
      "Strong understanding of data quality, lineage, observability, and access controls",
      "Ability to translate product questions into durable, well-documented data models",
      "Experience partnering with product, engineering, and business stakeholders",
    ],
    plans: [
      {
        status: "evaluated_held",
        interviewStatus: "completed",
        overallScore: 8.7,
        reportState: "held",
        batch: "active",
      },
      {
        status: "evaluated_held",
        interviewStatus: "completed",
        overallScore: 7.6,
        reportState: "held",
        batch: "active",
      },
      {
        status: "interview_in_progress",
        interviewStatus: "awaiting_voice",
        batch: "active",
      },
      { status: "interview_invited", interviewStatus: "pending", batch: "active" },
      { status: "queued_for_batch" },
    ] satisfies ApplicantPlan[],
    description: `RoundZero generates structured signals across jobs, applications, interviews, evaluations, and hiring decisions. We are hiring a Data Engineer to turn that operational data into a trustworthy foundation for product analytics, customer reporting, and internal decision-making.

You will build ingestion pipelines and analytical models, define quality checks, improve warehouse performance, and document the meaning and lineage of important metrics. You will also help us design event contracts and operational schemas so new product capabilities produce useful data from the start.

The role combines hands-on engineering with close partnership across product, engineering, customer success, and operations. You should care about reproducibility, privacy, and making it easy for others to answer important questions without rebuilding the same logic in multiple dashboards.`,
  },
  {
    title: "Growth Product Manager",
    target: 3,
    status: "open",
    workplace: "onsite",
    experience: "mid",
    salaryMin: 135000,
    salaryMax: 180000,
    requirements: [
      "4+ years in product management with ownership of activation, engagement, or retention",
      "Experience combining qualitative research with funnel and cohort analysis",
      "A strong record of designing experiments and turning results into product decisions",
      "Ability to write clear product requirements and align design, engineering, and go-to-market teams",
      "Comfort working with SQL, analytics tools, and imperfect early-stage data",
      "Strong customer empathy and judgment about responsible growth in a hiring product",
    ],
    plans: [
      {
        status: "evaluated",
        interviewStatus: "completed",
        overallScore: 9.1,
        reportState: "released",
        batch: "released",
      },
      {
        status: "shortlisted",
        interviewStatus: "completed",
        overallScore: 8.4,
        reportState: "released",
        batch: "released",
      },
      {
        status: "rejected",
        interviewStatus: "completed",
        overallScore: 6.2,
        reportState: "released",
        batch: "released",
      },
      { status: "queued_for_batch" },
      { status: "queued_for_batch" },
    ] satisfies ApplicantPlan[],
    description: `RoundZero helps recruiting teams reach a useful first outcome quickly: publish a role, evaluate applicants, and identify candidates worth deeper human attention. We are looking for a Growth Product Manager to make that path clearer and improve the habits that bring teams back for every new role.

You will own opportunities across onboarding, activation, team adoption, candidate engagement, and retention. The work includes interviewing customers, analyzing funnels and cohorts, shaping experiments, writing product requirements, and partnering with design and engineering through launch and measurement.

This is product-led growth work in a high-trust domain. We are not interested in dark patterns or vanity metrics. You will be expected to balance commercial outcomes with candidate experience, recruiter confidence, and the long-term quality of the hiring decisions our product supports.`,
  },
  {
    title: "DevOps Engineer",
    target: 5,
    status: "draft",
    workplace: "onsite",
    experience: "senior",
    salaryMin: 140000,
    salaryMax: 185000,
    requirements: [
      "5+ years operating cloud infrastructure for production software products",
      "Strong experience with infrastructure as code, CI/CD, and automated environment management",
      "Hands-on knowledge of Cloudflare, AWS, or comparable edge and cloud platforms",
      "Experience designing monitoring, alerting, incident response, and disaster-recovery practices",
      "Ability to improve security, reliability, and cost efficiency without slowing product delivery",
      "Clear documentation and a collaborative approach to enabling application engineers",
    ],
    plans: [] satisfies ApplicantPlan[],
    description: `RoundZero runs interactive candidate experiences and durable background workflows across Cloudflare and AWS. We are looking for a DevOps Engineer to make our delivery platform, production environments, and operational practices reliable enough to scale with the product.

You will own infrastructure as code, CI/CD pipelines, environment management, secrets, monitoring, alerting, and incident-response tooling. You will work with application engineers to improve deployment safety, diagnose production behavior, and design practical recovery plans for critical services and data.

The role also includes capacity planning, security hardening, and cloud cost visibility. Success means engineers can ship confidently, failures are detected and understood quickly, and the platform remains simple enough for a small team to operate without unnecessary process.`,
  },
] as const;

type SeedJobFactCategory =
  | "role_family"
  | "required_skill"
  | "seniority"
  | "domain"
  | "responsibility";

type SeedJobMatchingFacts = {
  roleFamilies: string[];
  requiredSkills: string[];
  domains?: string[];
  responsibilities?: string[];
};

const jobMatchingFacts: Record<string, SeedJobMatchingFacts> = {
  "Senior Full-Stack Engineer": {
    roleFamilies: ["full-stack-engineer", "frontend-engineer", "backend-engineer"],
    requiredSkills: ["typescript", "react", "node-js", "postgresql", "api-development"],
    domains: ["b2b-saas"],
    responsibilities: ["product-development", "cloud-infrastructure", "technical-mentoring"],
  },
  "Frontend Engineer": {
    roleFamilies: ["frontend-engineer"],
    requiredSkills: ["typescript", "react", "html", "css", "accessibility"],
    domains: ["b2b-saas"],
    responsibilities: ["product-development", "design-systems", "performance-optimization"],
  },
  "Backend Engineer": {
    roleFamilies: ["backend-engineer"],
    requiredSkills: ["typescript", "node-js", "postgresql", "api-development", "distributed-systems"],
    domains: ["b2b-saas"],
    responsibilities: ["cloud-infrastructure", "database-design", "production-operations"],
  },
  "Product Designer": {
    roleFamilies: ["product-designer"],
    requiredSkills: ["figma", "interaction-design", "user-research", "design-systems"],
    domains: ["b2b-saas"],
    responsibilities: ["product-development", "prototyping", "usability-testing"],
  },
  "Data Engineer": {
    roleFamilies: ["data-engineer"],
    requiredSkills: ["sql", "data-pipelines", "data-modeling", "data-quality"],
    domains: ["analytics"],
    responsibilities: ["database-design", "data-governance", "production-operations"],
  },
  "Growth Product Manager": {
    roleFamilies: ["product-manager", "growth-product-manager"],
    requiredSkills: ["product-analytics", "experimentation", "sql", "user-research"],
    domains: ["b2b-saas", "product-led-growth"],
    responsibilities: ["product-development", "growth-strategy", "stakeholder-management"],
  },
  "DevOps Engineer": {
    roleFamilies: ["devops-engineer", "site-reliability-engineer"],
    requiredSkills: ["cloudflare", "aws", "infrastructure-as-code", "ci-cd", "observability"],
    domains: ["cloud-infrastructure"],
    responsibilities: ["cloud-infrastructure", "production-operations", "incident-response"],
  },
};

const matchingFactLabelOverrides: Record<string, string> = {
  aws: "AWS",
  "b2b-saas": "B2B SaaS",
  "ci-cd": "CI/CD",
  css: "CSS",
  figma: "Figma",
  html: "HTML",
  "node-js": "Node.js",
  postgresql: "PostgreSQL",
  react: "React",
  sql: "SQL",
  typescript: "TypeScript",
};

const matchingFactLabel = (canonicalId: string) =>
  matchingFactLabelOverrides[canonicalId] ??
  canonicalId
    .split("-")
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");

const makeMatchingFact = (category: SeedJobFactCategory, canonicalId: string) => ({
  id: `job-${category.replaceAll("_", "-")}-${canonicalId}`,
  category,
  canonicalId,
  label: matchingFactLabel(canonicalId),
});

const buildSeedJobMatchingProfile = (
  template: (typeof jobTemplates)[number],
  facts: SeedJobMatchingFacts,
) => ({
  facts: [
    ...facts.roleFamilies.map((id) => makeMatchingFact("role_family", id)),
    ...facts.requiredSkills.map((id) => makeMatchingFact("required_skill", id)),
    makeMatchingFact("seniority", template.experience),
    ...(facts.domains ?? []).map((id) => makeMatchingFact("domain", id)),
    ...(facts.responsibilities ?? []).map((id) => makeMatchingFact("responsibility", id)),
  ],
});

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
  website: "https://tryroundzero.com",
  foundedYear: 2022,
  techStack: ["TypeScript", "React", "Node.js", "PostgreSQL", "Cloudflare Workers"],
  culture:
    "High ownership, fast shipping, strong product taste. We bias toward clarity, measurable outcomes, and respectful candidate experiences.",
  socialLinks: {
    Website: "https://tryroundzero.com",
    LinkedIn: "https://linkedin.com/company/roundzero",
  },
} as const;

function clampPreScore(index: number, status: ApplicantStatus) {
  const base = status === "interview_invited" ? 6.8 : status === "interview_in_progress" ? 7.2 : 7.5;
  return Math.round((base + (index % 4) * 0.15) * 10) / 10;
}

function parseEmailArgs() {
  const emails = process.argv.slice(2).filter((arg) => arg.includes("@"));
  if (emails.length > 1) {
    throw new Error(
      "The seed accepts one optional company email. Candidate accounts are never seeded.",
    );
  }
  return emails[0];
}

// ─── Phase 1: synthetic candidate pool ─────────────────────────────

const syntheticCandidateProfiles = [
  { name: "Sarah Chen", picture: "https://i.pravatar.cc/300?img=47" },
  { name: "Marcus Johnson", picture: "https://i.pravatar.cc/300?img=33" },
  { name: "Priya Patel", picture: "https://i.pravatar.cc/300?img=45" },
  { name: "James Okonkwo", picture: "https://i.pravatar.cc/300?img=12" },
  { name: "Emily Rodriguez", picture: "https://i.pravatar.cc/300?img=9" },
  { name: "David Kim", picture: "https://i.pravatar.cc/300?img=13" },
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
      industry, company_size, location, website, founded_year, tech_stack, culture, social_links,
      subscription_plan, subscription_status
    ) VALUES (
      ${companyId}, ${ownerId}, ${demoCompanyProfile.name}, ${slug}, now(),
      ${demoCompanyProfile.description},
      ${`logos/${companyId}.png`},
      ${demoCompanyProfile.industry}, ${demoCompanyProfile.companySize}, ${demoCompanyProfile.location},
      ${demoCompanyProfile.website}, ${demoCompanyProfile.foundedYear},
      ${sql.json(demoCompanyProfile.techStack)},
      ${demoCompanyProfile.culture},
      ${sql.json(demoCompanyProfile.socialLinks)},
      ${"scale"},
      ${"active"}
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
      subscription_plan = EXCLUDED.subscription_plan,
      subscription_status = EXCLUDED.subscription_status,
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
        ${sql.json(template.requirements)},
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
        requirements = EXCLUDED.requirements,
        screening_questions = EXCLUDED.screening_questions,
        status = EXCLUDED.status,
        location = EXCLUDED.location,
        workplace_type = EXCLUDED.workplace_type,
        employment_type = EXCLUDED.employment_type,
        experience_level = EXCLUDED.experience_level,
        salary_min = EXCLUDED.salary_min,
        salary_max = EXCLUDED.salary_max,
        salary_currency = EXCLUDED.salary_currency,
        team_size = EXCLUDED.team_size,
        headcount = EXCLUDED.headcount,
        final_report_target = EXCLUDED.final_report_target,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    `;

    const facts = jobMatchingFacts[template.title];
    if (!facts) {
      throw new Error(`Missing seed matching facts for ${template.title}`);
    }

    if (template.status === "open") {
      const sourceHash = await hashStableValue({
        title: template.title.trim(),
        description: template.description.trim(),
        requirements: template.requirements,
        experienceLevel: template.experience,
        profileVersion: MATCHING_CONFIG.jobProfileVersion,
      });
      const matchingProfile = buildSeedJobMatchingProfile(template, facts);

      await sql`
        INSERT INTO job_matching_profiles (
          job_id, requested_source_hash, completed_source_hash, source_version,
          extraction_status, matching_profile, model, prompt_version,
          extraction_token, extraction_claimed_at, completed_at
        ) VALUES (
          ${jobId}, ${sourceHash}, ${sourceHash}, ${MATCHING_CONFIG.jobProfileVersion},
          ${"ready"}, ${sql.json(matchingProfile)}, ${"seed"},
          ${MATCHING_CONFIG.jobProfileVersion},
          ${makeUuidFromSeed(`seed-job-matching-profile-${jobId}`)}, NULL, now()
        )
        ON CONFLICT (job_id) DO UPDATE
        SET
          requested_source_hash = EXCLUDED.requested_source_hash,
          completed_source_hash = EXCLUDED.completed_source_hash,
          source_version = EXCLUDED.source_version,
          extraction_status = EXCLUDED.extraction_status,
          extraction_error = NULL,
          matching_profile = EXCLUDED.matching_profile,
          model = EXCLUDED.model,
          prompt_version = EXCLUDED.prompt_version,
          extraction_token = EXCLUDED.extraction_token,
          extraction_claimed_at = NULL,
          completed_at = now(),
          updated_at = now()
      `;
    }

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
  for (const [messageIndex, message] of messages.entries()) {
    await sql`
      INSERT INTO interview_messages (interview_id, turn_id, role, content)
      VALUES (
        ${interviewId},
        ${`seed-${index}-${messageIndex}`},
        ${message.role},
        ${message.content}
      )
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
    INSERT INTO applications (
      id, job_id, candidate_id, resume_key, metadata, status, queued_at, created_at, updated_at
    )
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
      ${plan.status === "queued_for_batch" ? updatedAt : null},
      ${createdAt},
      ${updatedAt}
    )
    ON CONFLICT (id) DO UPDATE
    SET
      status = EXCLUDED.status,
      queued_at = EXCLUDED.queued_at,
      metadata = EXCLUDED.metadata,
      updated_at = EXCLUDED.updated_at
  `;

  if (plan.status !== "applied" && plan.status !== "pre_screening") {
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
        ${preScore >= 7 ? "interview_invited" : "hold"},
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

  const interviewStatus = plan.interviewStatus;
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

  const linkToBatch = batchId !== null;

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

  if (
    interviewStatus !== "completed" ||
    plan.overallScore === undefined ||
    plan.reportState === undefined ||
    !completedAt
  ) {
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
  const releasedAt = plan.reportState === "released"
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

function expectedProgress(plans: ApplicantPlan[]) {
  return {
    delivered: plans.filter((plan) => plan.reportState === "released").length,
    processing: plans.filter(
      (plan) => plan.reportState !== "released" && plan.interviewStatus === "completed",
    ).length,
    underway: plans.filter(
      (plan) =>
        plan.reportState !== "released" &&
        plan.interviewStatus !== undefined &&
        ["pending", "in_progress", "awaiting_voice"].includes(plan.interviewStatus),
    ).length,
    waitlisted: plans.filter((plan) => plan.status === "queued_for_batch").length,
  };
}

function validateScenario(template: (typeof jobTemplates)[number]) {
  const progress = expectedProgress(template.plans);
  if (progress.delivered + progress.processing + progress.underway > template.target) {
    throw new Error(`${template.title} seeds more delivered and reserved reports than its target.`);
  }

  for (const plan of template.plans) {
    if (plan.status === "queued_for_batch" && plan.interviewStatus !== undefined) {
      throw new Error(`${template.title} gives a waitlisted application an interview.`);
    }
    if (plan.reportState !== undefined && plan.interviewStatus !== "completed") {
      throw new Error(`${template.title} gives a report to an incomplete interview.`);
    }
    if (plan.reportState !== undefined && plan.overallScore === undefined) {
      throw new Error(`${template.title} gives a report no score.`);
    }
    if (plan.batch !== undefined && plan.interviewStatus === undefined) {
      throw new Error(`${template.title} assigns an application without an interview to a batch.`);
    }
    if (plan.reportState === "held" && plan.batch !== "active") {
      throw new Error(`${template.title} has a held report outside an active batch.`);
    }
  }
}

async function resetSeededJobPipelines(jobs: SeedJob[]) {
  for (const job of jobs) {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM notifications WHERE payload->>'jobId' = ${job.id}`;
      await tx`
        DELETE FROM reports
        WHERE application_id IN (SELECT id FROM applications WHERE job_id = ${job.id})
      `;
      await tx`
        DELETE FROM communication_assessments
        WHERE application_id IN (SELECT id FROM applications WHERE job_id = ${job.id})
      `;
      await tx`
        DELETE FROM interview_messages
        WHERE interview_id IN (
          SELECT i.id
          FROM interviews i
          JOIN applications a ON a.id = i.application_id
          WHERE a.job_id = ${job.id}
        )
      `;
      await tx`
        DELETE FROM interviews
        WHERE application_id IN (SELECT id FROM applications WHERE job_id = ${job.id})
      `;
      await tx`
        DELETE FROM pre_evaluations
        WHERE application_id IN (SELECT id FROM applications WHERE job_id = ${job.id})
      `;
      await tx`DELETE FROM applications WHERE job_id = ${job.id}`;
      await tx`DELETE FROM job_batches WHERE job_id = ${job.id}`;
    });
  }
}

async function assertSeededScenario(job: SeedJob, plans: ApplicantPlan[]) {
  const expected = expectedProgress(plans);
  const rows = await sql<
    {
      delivered: number;
      processing: number;
      underway: number;
      waitlisted: number;
    }[]
  >`
    SELECT
      count(DISTINCT a.id) FILTER (WHERE released.application_id IS NOT NULL)::int AS delivered,
      count(DISTINCT a.id) FILTER (
        WHERE released.application_id IS NULL AND i.status = 'completed'
      )::int AS processing,
      count(DISTINCT a.id) FILTER (
        WHERE released.application_id IS NULL
          AND i.status IN ('pending', 'in_progress', 'awaiting_voice')
      )::int AS underway,
      count(DISTINCT a.id) FILTER (WHERE a.status = 'queued_for_batch')::int AS waitlisted
    FROM applications a
    LEFT JOIN interviews i ON i.application_id = a.id
    LEFT JOIN (
      SELECT DISTINCT application_id
      FROM reports
      WHERE released_at IS NOT NULL
    ) released ON released.application_id = a.id
    WHERE a.job_id = ${job.id}
  `;

  const actual = rows[0];
  if (!actual || Object.keys(expected).some((key) => actual[key] !== expected[key])) {
    throw new Error(
      `${job.title} progress mismatch. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }

  console.log(
    `  ${job.title}: ${actual.delivered} delivered, ${actual.processing} processing, ${actual.underway} underway, ${actual.waitlisted} waitlisted`,
  );
}

async function seedApplicationsAndReports(
  companyId: string,
  jobs: SeedJob[],
  candidates: CandidateUser[],
) {
  const openJobs = jobs.filter((_, index) => jobTemplates[index]?.status === "open");
  await resetSeededJobPipelines(jobs);

  let candidateOffset = 0;

  for (let jobIndex = 0; jobIndex < openJobs.length; jobIndex++) {
    const job = openJobs[jobIndex]!;
    const template = jobTemplates[jobIndex]!;
    const plans = template.plans;
    validateScenario(template);

    const batchIds: Partial<Record<"active" | "released", string>> = {};
    for (const batchStatus of ["released", "active"] as const) {
      const batchPlans = plans.filter((plan) => plan.batch === batchStatus);
      if (batchPlans.length === 0) {
        continue;
      }

      const batchId = makeUuidFromSeed(`dashboard-seed-batch-${job.id}-${batchStatus}`);
      batchIds[batchStatus] = batchId;
      const launchedAt = new Date(
        Date.now() - (batchStatus === "active" ? 2 : 10) * 24 * 60 * 60 * 1000,
      );
      const releasedAt = batchStatus === "active"
        ? null
        : new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      await sql`
        INSERT INTO job_batches (id, job_id, status, target_size, launched_at, released_at)
        VALUES (
          ${batchId},
          ${job.id},
          ${batchStatus},
          ${batchPlans.length},
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
        batchId: plan.batch ? (batchIds[plan.batch] ?? null) : null,
        createdAt,
        updatedAt,
      });
    }

    candidateOffset += plans.length;
    await assertSeededScenario(job, plans);
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

// ─── Main ──────────────────────────────────────────────────────────

try {
  const companyEmail = parseEmailArgs();
  console.log("Starting RoundZero seed...\n");

  console.log("Phase 1 — synthetic candidate pool");
  await seedSyntheticCandidates();

  console.log("\nPhase 2 — company dashboard");
  await seedCompanyDashboard(companyEmail);

  console.log("\nSeed completed successfully.");
} catch (error) {
  console.error("\nSeed failed:", error);
  process.exit(1);
} finally {
  await closeSql();
}
