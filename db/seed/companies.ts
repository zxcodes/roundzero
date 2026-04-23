// @ts-nocheck
import { closeSql, copycat, makeUuid, pick, sql } from "./util";

const companyNames = [
  "Northstar AI",
  "BlueOrbit",
  "StrideCloud",
  "ForgePay",
  "Meridian Health Tech",
  "LatticeOps",
  "PilotGrid",
  "Canopy Data",
  "HelioCommerce",
  "Summit Labs",
  "Nimbus Security",
  "TerraFleet",
  "Clearpath Systems",
  "Axiom Robotics",
  "BeaconWorks",
  "VantaEdge",
  "KiteFi",
  "Prism Clinical",
  "Rivet Dynamics",
  "AtlasIQ",
] as const;

const sectors = [
  "Fintech",
  "Healthtech",
  "Developer Tools",
  "Logistics",
  "Security",
  "Analytics",
  "B2B SaaS",
] as const;

const industries = [
  "technology",
  "finance",
  "healthcare",
  "education",
  "ecommerce",
  "saas",
  "consulting",
  "gaming",
  "media",
  "other",
] as const;

const companySizes = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

const techStacks = [
  ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Redis"],
  ["Python", "Django", "PostgreSQL", "Celery", "GCP", "Docker"],
  ["Go", "Kubernetes", "Terraform", "gRPC", "ClickHouse", "Prometheus"],
  ["TypeScript", "Next.js", "Prisma", "Tailwind CSS", "Vercel", "Stripe API"],
  ["Java", "Spring Boot", "Kafka", "PostgreSQL", "AWS", "Elasticsearch"],
  ["Rust", "WebAssembly", "C++", "Linux", "Redis", "gRPC"],
  ["TypeScript", "Vue.js", "GraphQL", "PostgreSQL", "Docker", "Cloudflare Workers"],
  ["Python", "FastAPI", "SQLAlchemy", "Redis", "AWS", "Terraform"],
] as const;

const cultureTexts = [
  "We value autonomy, clear communication, and shipping high-quality work. Async-first with optional in-person meetups quarterly.",
  "Engineering-driven culture with weekly demos, blameless retros, and a strong emphasis on documentation and code review.",
  "Small, focused teams with full ownership of their domain. We invest heavily in DX, testing, and operational excellence.",
  "Collaborative environment with a bias for action. We ship fast, measure everything, and iterate based on real user feedback.",
  "Remote-first with flexible hours. We care about outcomes, not hours logged. Strong mentorship culture with regular 1:1s.",
  "Flat hierarchy where engineers have direct access to customers. We prioritize technical depth and long-term thinking.",
] as const;

const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function seedCompanies() {
  const companyUsers = await sql<{ id: string }[]>`
    SELECT id
    FROM users
    WHERE role = 'company'
      AND google_id LIKE 'rz-seed-company-google-%'
    ORDER BY created_at ASC
    LIMIT 20
  `;

  if (companyUsers.length < 20) {
    throw new Error("Expected at least 20 seeded company users. Run users seed first.");
  }

  const companies = companyUsers.map((owner, index) => {
    const city = copycat.city(`rz-seed-company-city-${index + 1}`);
    const sector = pick(sectors, index);
    const industry = pick(industries, index);
    const companySize = pick(companySizes, index + 1);
    const slug = generateSlug(companyNames[index]!);

    return {
      id: makeUuid("rz-seed-company", index + 1),
      ownerId: owner.id,
      name: companyNames[index]!,
      slug,
      logoKey: `https://ui-avatars.com/api/?name=${encodeURIComponent(companyNames[index]!)}&background=0f8f8b&color=ffffff&size=256&bold=true&format=svg`,
      description: `${companyNames[index]!} is a ${sector.toLowerCase()} company based in ${city}. We build software for enterprise operators and product teams, with a strong focus on reliability, measurable outcomes, and long-term platform scalability.`,
      industry,
      companySize,
      location: city,
      website: `https://${slug}.com`,
      foundedYear: 2015 + (index % 10),
      techStack: [...pick(techStacks, index)],
      culture: pick(cultureTexts, index),
      socialLinks: {
        LinkedIn: `https://linkedin.com/company/${slug}`,
        Twitter: `https://twitter.com/${slug}`,
      },
    };
  });

  for (const company of companies) {
    await sql`
      INSERT INTO companies (
        id, owner_id, name, slug, onboarding_completed_at, description, logo_key, industry, company_size,
        location, website, founded_year, tech_stack, culture, social_links
      )
      VALUES (
        ${company.id}, ${company.ownerId}, ${company.name}, ${company.slug}, now(),
        ${company.description}, ${company.logoKey}, ${company.industry}, ${company.companySize},
        ${company.location}, ${company.website}, ${company.foundedYear},
        ${sql.json(company.techStack)}, ${company.culture}, ${sql.json(company.socialLinks)}
      )
      ON CONFLICT (id) DO UPDATE
      SET
        owner_id = EXCLUDED.owner_id,
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        onboarding_completed_at = EXCLUDED.onboarding_completed_at,
        description = EXCLUDED.description,
        logo_key = EXCLUDED.logo_key,
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

  console.log(`Companies seeded/upserted: ${companies.length}`);
}

try {
  await seedCompanies();
} finally {
  await closeSql();
}
