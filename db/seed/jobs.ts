import { closeSql, copycat, makeUuid, pick, randomInt, sql } from "./util";

type DomainTemplate = {
  domain: string;
  mission: string;
  techStack: string[];
  priorities: string[];
  roleTitles: string[];
  compensation: { min: number; max: number; currency: string };
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
    compensation: { min: 145000, max: 220000, currency: "USD" },
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
    compensation: { min: 155000, max: 240000, currency: "USD" },
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
  },
];

const offices = [
  "San Francisco, CA",
  "New York, NY",
  "Austin, TX",
  "Seattle, WA",
  "Chicago, IL",
  "Boston, MA",
] as const;

const remotePolicies = [
  "Remote (US)",
  "Hybrid (3 days in office)",
  "Hybrid (2 days in office)",
  "On-site",
] as const;

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
  const office = pick(offices, randomInt(`${seed}-office`, 0, 100));
  const remotePolicy = pick(remotePolicies, randomInt(`${seed}-remote`, 0, 100));
  const bonus = randomInt(`${seed}-bonus`, 10, 20);
  const equity = randomInt(`${seed}-equity`, 1, 5) / 10;

  return [
    `${companyName} is hiring a ${title} to join our ${template.domain} product team. ${template.mission}`,
    `In this role, you will partner with product, design, and data to deliver roadmap initiatives across the next ${roadmap} quarters. You will directly influence architecture choices and engineering standards while collaborating with a ${teamSize}-person cross-functional squad.`,
    `Success in the first 90 days includes shipping at least one customer-facing capability, improving one internal reliability metric, and contributing to design docs for our ${launchWindow}-day platform roadmap. Immediate focus areas are ${priorityA} and ${priorityB}.`,
    `Core stack includes ${template.techStack.join(", ")}. Experience with similar systems is valued, but strong problem-solving, ownership, and communication are equally important.`,
    `Compensation & location: ${template.compensation.currency} ${template.compensation.min.toLocaleString()} - ${template.compensation.max.toLocaleString()} base + up to ${bonus}% annual bonus + ${equity}% equity band. Location: ${office}. Work model: ${remotePolicy}.`,
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

async function seedJobs() {
  const companies = await sql<{ id: string; name: string }[]>`
    SELECT c.id, c.name
    FROM companies c
    JOIN users u ON u.id = c.owner_id
    WHERE u.google_id LIKE 'hirely-seed-company-google-%'
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
  }>;

  let counter = 1;
  for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
    const template = templates[companyIndex % templates.length]!;
    const company = companies[companyIndex]!;

    for (let n = 0; n < 2; n++) {
      const seed = `hirely-seed-job-${counter}`;
      const title = pick(template.roleTitles, randomInt(`${seed}-title`, 0, 999));
      const description = buildDescription(company.name, title, template, seed);
      const requirements = buildRequirements(template, seed);

      const status: "draft" | "open" | "closed" =
        counter % 6 === 0 ? "draft" : counter % 9 === 0 ? "closed" : "open";

      jobs.push({
        id: makeUuid("hirely-seed-job", counter),
        companyId: company.id,
        title,
        description,
        requirements,
        status,
      });

      counter += 1;
    }
  }

  for (const job of jobs) {
    await sql`
      INSERT INTO jobs (id, company_id, title, description, requirements, status)
      VALUES (${job.id}, ${job.companyId}, ${job.title}, ${job.description}, ${sql.json(job.requirements)}, ${job.status})
      ON CONFLICT (id) DO UPDATE
      SET
        company_id = EXCLUDED.company_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        requirements = EXCLUDED.requirements,
        status = EXCLUDED.status,
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
