import { closeSql, copycat, makeUuid, pick, randomInt, sql } from "./util";

type DomainTemplate = {
  domain: string;
  mission: string;
  techStack: string[];
  priorities: string[];
  roleTitles: string[];
  compensation: { min: number; max: number; currency: string };
  experienceLevels: string[];
};

const templates: DomainTemplate[] = [
  {
    domain: "fintech",
    mission:
      "Build resilient payment and ledger infrastructure that keeps settlement correctness and customer trust at the center.",
    techStack: ["TypeScript", "PostgreSQL", "Kafka", "Redis", "AWS"],
    priorities: ["transaction integrity", "fraud controls", "high availability", "audit readiness"],
    roleTitles: [
      "Senior Backend Engineer",
      "Payments Platform Engineer",
      "Risk Systems Engineer",
      "Data Infrastructure Engineer",
    ],
    compensation: { min: 150000, max: 230000, currency: "USD" },
    experienceLevels: ["senior", "staff", "lead"],
  },
  {
    domain: "healthtech",
    mission:
      "Improve care delivery workflows for providers and patients through reliable, compliant, and user-friendly software.",
    techStack: ["TypeScript", "React", "PostgreSQL", "FHIR APIs", "GCP"],
    priorities: ["clinical workflow speed", "privacy", "system reliability", "integration quality"],
    roleTitles: [
      "Product Engineer",
      "Staff Frontend Engineer",
      "Healthcare Integrations Engineer",
      "Platform Engineer",
    ],
    compensation: { min: 1200000, max: 3500000, currency: "INR" },
    experienceLevels: ["mid", "senior", "staff"],
  },
  {
    domain: "devtools",
    mission:
      "Help engineering teams ship faster by improving DX, CI reliability, and observability from local dev to production.",
    techStack: ["Go", "TypeScript", "ClickHouse", "Kubernetes", "OpenTelemetry"],
    priorities: ["developer velocity", "debuggability", "performance", "operational simplicity"],
    roleTitles: [
      "Senior Fullstack Engineer",
      "Infrastructure Engineer",
      "Site Reliability Engineer",
      "Developer Experience Engineer",
    ],
    compensation: { min: 120000, max: 190000, currency: "CAD" },
    experienceLevels: ["senior", "staff", "principal"],
  },
  {
    domain: "logistics",
    mission:
      "Optimize dispatching and route operations with real-time decision support and measurable fleet efficiency gains.",
    techStack: ["TypeScript", "Rust", "PostgreSQL", "Redis", "Map APIs"],
    priorities: ["latency", "planning accuracy", "operational insights", "mobile reliability"],
    roleTitles: [
      "Backend Engineer",
      "Optimization Engineer",
      "Mobile Engineer",
      "Data Engineer",
    ],
    compensation: { min: 140000, max: 210000, currency: "USD" },
    experienceLevels: ["mid", "senior", "lead"],
  },
  {
    domain: "edtech",
    mission:
      "Make quality education accessible at scale through adaptive learning platforms and seamless content delivery.",
    techStack: ["TypeScript", "React", "Python", "PostgreSQL", "AWS"],
    priorities: ["learner engagement", "content delivery speed", "accessibility", "data-driven personalization"],
    roleTitles: [
      "Fullstack Engineer",
      "Platform Engineer",
      "ML Engineer",
      "Frontend Engineer",
    ],
    compensation: { min: 800000, max: 2500000, currency: "INR" },
    experienceLevels: ["junior", "mid", "senior"],
  },
  {
    domain: "e-commerce",
    mission:
      "Build high-performance marketplace infrastructure that drives conversion and delivers a seamless shopping experience.",
    techStack: ["TypeScript", "Next.js", "PostgreSQL", "Elasticsearch", "Stripe"],
    priorities: ["checkout reliability", "search relevance", "page performance", "inventory accuracy"],
    roleTitles: [
      "Senior Frontend Engineer",
      "Search Engineer",
      "Payments Engineer",
      "Backend Engineer",
    ],
    compensation: { min: 55000, max: 95000, currency: "GBP" },
    experienceLevels: ["mid", "senior", "lead"],
  },
  {
    domain: "cybersecurity",
    mission:
      "Protect enterprise infrastructure through proactive threat detection, zero-trust architecture, and rapid incident response.",
    techStack: ["Go", "Python", "Kubernetes", "PostgreSQL", "Terraform"],
    priorities: ["threat detection", "incident response time", "compliance", "zero-trust adoption"],
    roleTitles: [
      "Security Engineer",
      "Detection Engineer",
      "Infrastructure Security Engineer",
      "AppSec Engineer",
    ],
    compensation: { min: 70000, max: 120000, currency: "EUR" },
    experienceLevels: ["senior", "staff", "lead"],
  },
  {
    domain: "climate-tech",
    mission:
      "Accelerate the energy transition through real-time grid analytics, carbon accounting, and renewable optimization software.",
    techStack: ["Python", "TypeScript", "TimescaleDB", "Kafka", "GCP"],
    priorities: ["data accuracy", "real-time processing", "regulatory compliance", "scalability"],
    roleTitles: [
      "Data Engineer",
      "Backend Engineer",
      "Analytics Engineer",
      "Platform Engineer",
    ],
    compensation: { min: 110000, max: 175000, currency: "CAD" },
    experienceLevels: ["mid", "senior", "staff"],
  },
];

const officesByCurrency: Record<string, readonly string[]> = {
  USD: ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Chicago, IL", "Boston, MA", "Denver, CO", "Los Angeles, CA"],
  INR: ["Bangalore, India", "Mumbai, India", "Hyderabad, India", "Pune, India", "Delhi NCR, India", "Chennai, India"],
  CAD: ["Toronto, Canada", "Vancouver, Canada", "Montreal, Canada", "Ottawa, Canada", "Calgary, Canada"],
  GBP: ["London, UK", "Manchester, UK", "Edinburgh, UK", "Bristol, UK"],
  EUR: ["Berlin, Germany", "Amsterdam, Netherlands", "Dublin, Ireland", "Paris, France"],
  AUD: ["Sydney, Australia", "Melbourne, Australia", "Brisbane, Australia"],
};
const defaultOffices = ["San Francisco, CA", "New York, NY", "London, UK"] as const;

const workplaceTypes = ["remote", "hybrid", "onsite"] as const;
const employmentTypes = ["full_time", "contract"] as const;

function buildDescription(
  companyName: string,
  title: string,
  template: DomainTemplate,
  seed: string,
): string {
  const teamSize = randomInt(`${seed}-team-size`, 6, 14);
  const roadmap = randomInt(`${seed}-roadmap`, 2, 6);
  const launchWindow = randomInt(`${seed}-launch`, 30, 120);
  const priorityA = pick(template.priorities, randomInt(`${seed}-priority-a`, 0, 100));
  const priorityB = pick(template.priorities, randomInt(`${seed}-priority-b`, 0, 100));

  return [
    `${companyName} is hiring a ${title} to join our ${template.domain} product team. ${template.mission}`,
    `In this role, you will partner with product, design, and data to deliver roadmap initiatives across the next ${roadmap} quarters. You will directly influence architecture choices and engineering standards while collaborating with a ${teamSize}-person cross-functional squad.`,
    `Success in the first 90 days includes shipping at least one customer-facing capability, improving one internal reliability metric, and contributing to design docs for our ${launchWindow}-day platform roadmap. Immediate focus areas are ${priorityA} and ${priorityB}.`,
    `Core stack includes ${template.techStack.join(", ")}. Experience with similar systems is valued, but strong problem-solving, ownership, and communication are equally important.`,
  ].join("\n\n");
}

function buildRequirements(template: DomainTemplate, seed: string): string[] {
  const years = randomInt(`${seed}-years`, 3, 8);
  const stackA = pick(template.techStack, randomInt(`${seed}-stack-a`, 0, 100));
  const stackB = pick(template.techStack, randomInt(`${seed}-stack-b`, 0, 100));
  const priority = pick(template.priorities, randomInt(`${seed}-priority`, 0, 100));

  return [
    `${years}+ years of software engineering experience in production environments`,
    `Hands-on experience with ${stackA} and ${stackB} in a customer-facing product`,
    `Strong system design fundamentals and ability to reason through tradeoffs`,
    `Demonstrated ownership of projects from technical design to production rollout`,
    `Excellent cross-functional communication and a bias for measurable outcomes`,
    `Experience improving ${priority} through iterative engineering changes`,
  ];
}

function buildInterviewQuestions(template: DomainTemplate, seed: string): string[] {
  const priorityA = pick(template.priorities, randomInt(`${seed}-assessment-a`, 0, 100));
  const priorityB = pick(template.priorities, randomInt(`${seed}-assessment-b`, 0, 100));
  const stack = pick(template.techStack, randomInt(`${seed}-assessment-stack`, 0, 100));

  return [
    `Are you comfortable working with ${stack} in production?`,
    `Can you describe your experience with ${priorityA}?`,
    `What's your approach to ${priorityB} in real-world projects?`,
    "Are you open to occasional on-site collaboration?",
  ];
}

async function seedJobs() {
  const companies = await sql<{ id: string; name: string }[]>`
    SELECT c.id, c.name
    FROM companies c
    JOIN users u ON u.id = c.owner_id
    WHERE u.google_id LIKE 'rz-seed-company-google-%'
    ORDER BY c.created_at ASC
    LIMIT 20
  `;

  if (companies.length < 20) {
    throw new Error("Expected at least 20 companies. Run companies seed first.");
  }

  const jobs = [] as Array<{
    id: string;
    companyId: string;
    title: string;
    description: string;
    requirements: string[];
    status: "draft" | "open" | "closed";
    location: string;
    workplaceType: string;
    employmentType: string;
    experienceLevel: string;
    salaryMin: number;
    salaryMax: number;
    salaryCurrency: string;
    teamSize: number;
    headcount: number;
    interviewQuestions: string[];
    expiresAt: Date | null;
  }>;

  let counter = 1;
  for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
    const template = templates[companyIndex % templates.length]!;
    const company = companies[companyIndex]!;

    for (let n = 0; n < 2; n++) {
      const seed = `rz-seed-job-${counter}`;
      const title = pick(template.roleTitles, randomInt(`${seed}-title`, 0, 999));
      const description = buildDescription(company.name, title, template, seed);
      const requirements = buildRequirements(template, seed);

      const status: "draft" | "open" | "closed" =
        counter % 6 === 0 ? "draft" : counter % 9 === 0 ? "closed" : "open";

      const offices = officesByCurrency[template.compensation.currency] ?? defaultOffices;
      const location = pick(offices, randomInt(`${seed}-office`, 0, 100));
      const workplace = pick(workplaceTypes, randomInt(`${seed}-workplace`, 0, 100));
      const employment = pick(employmentTypes, randomInt(`${seed}-employment`, 0, 100));
      const expLevel = pick(template.experienceLevels, randomInt(`${seed}-exp`, 0, 100));

      // Salary within template range with some variation
      const salarySpread = template.compensation.max - template.compensation.min;
      const salaryMin = template.compensation.min + randomInt(`${seed}-sal-min`, 0, Math.floor(salarySpread * 0.3));
      const salaryMax = salaryMin + randomInt(`${seed}-sal-max`, Math.floor(salarySpread * 0.3), salarySpread);

      const teamSize = randomInt(`${seed}-team`, 4, 20);
      const headcount = randomInt(`${seed}-headcount`, 1, 4);
      const expiresAt =
        status === "open" && counter % 5 === 0
          ? new Date(Date.now() + randomInt(`${seed}-expiry-days`, 10, 45) * 24 * 60 * 60 * 1000)
          : null;

      jobs.push({
        id: makeUuid("rz-seed-job", counter),
        companyId: company.id,
        title,
        description,
        requirements,
        status,
        location,
        workplaceType: workplace,
        employmentType: employment,
        experienceLevel: expLevel,
        salaryMin,
        salaryMax,
        salaryCurrency: template.compensation.currency,
        teamSize,
        headcount,
        interviewQuestions: buildInterviewQuestions(template, seed),
        expiresAt,
      });

      counter += 1;
    }
  }

  for (const job of jobs) {
    await sql`
      INSERT INTO jobs (
        id, company_id, title, description, requirements, status,
        interview_questions, location, workplace_type, employment_type, experience_level,
        salary_min, salary_max, salary_currency, team_size, headcount, expires_at
      )
      VALUES (
        ${job.id}, ${job.companyId}, ${job.title}, ${job.description},
        ${sql.json(job.requirements)}, ${job.status},
        ${sql.json(job.interviewQuestions)},
        ${job.location}, ${job.workplaceType}, ${job.employmentType}, ${job.experienceLevel},
        ${job.salaryMin}, ${job.salaryMax}, ${job.salaryCurrency}, ${job.teamSize}, ${job.headcount}, ${job.expiresAt}
      )
      ON CONFLICT (id) DO UPDATE
      SET
        company_id = EXCLUDED.company_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        requirements = EXCLUDED.requirements,
        status = EXCLUDED.status,
        interview_questions = EXCLUDED.interview_questions,
        location = EXCLUDED.location,
        workplace_type = EXCLUDED.workplace_type,
        employment_type = EXCLUDED.employment_type,
        experience_level = EXCLUDED.experience_level,
        salary_min = EXCLUDED.salary_min,
        salary_max = EXCLUDED.salary_max,
        salary_currency = EXCLUDED.salary_currency,
        team_size = EXCLUDED.team_size,
        headcount = EXCLUDED.headcount,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    `;
  }

  console.log(`Jobs seeded/upserted: ${jobs.length}`);
}

try {
  await seedJobs();
} finally {
  await closeSql();
}
