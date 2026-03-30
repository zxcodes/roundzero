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
      AND google_id LIKE 'hirely-seed-company-google-%'
    ORDER BY created_at ASC
    LIMIT 20
  `;

  if (companyUsers.length < 20) {
    throw new Error("Expected at least 20 seeded company users. Run users seed first.");
  }

  const companies = companyUsers.map((owner, index) => {
    const city = copycat.city(`hirely-seed-company-city-${index + 1}`);
    const sector = pick(sectors, index);
    const industry = pick(industries, index);
    const companySize = pick(companySizes, index + 1);

    return {
      id: makeUuid("hirely-seed-company", index + 1),
      ownerId: owner.id,
      name: companyNames[index]!,
      slug: generateSlug(companyNames[index]!),
      description: `${companyNames[index]!} is a ${sector.toLowerCase()} company based in ${city}. We build software for enterprise operators and product teams, with a strong focus on reliability, measurable outcomes, and long-term platform scalability.`,
      industry,
      companySize,
      location: city,
      website: `https://${generateSlug(companyNames[index]!)}.com`,
    };
  });

  for (const company of companies) {
    await sql`
      INSERT INTO companies (id, owner_id, name, slug, description, industry, company_size, location, website)
      VALUES (${company.id}, ${company.ownerId}, ${company.name}, ${company.slug}, ${company.description}, ${company.industry}, ${company.companySize}, ${company.location}, ${company.website})
      ON CONFLICT (id) DO UPDATE
      SET
        owner_id = EXCLUDED.owner_id,
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        industry = EXCLUDED.industry,
        company_size = EXCLUDED.company_size,
        location = EXCLUDED.location,
        website = EXCLUDED.website,
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
