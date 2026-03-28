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

const sizeRanges = ["50-100", "100-250", "250-500", "500-1,000"] as const;

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
    const size = pick(sizeRanges, index + 2);

    return {
      id: makeUuid("hirely-seed-company", index + 1),
      ownerId: owner.id,
      name: companyNames[index]!,
      description: `${companyNames[index]!} is a ${sector.toLowerCase()} company based in ${city}. We build software for enterprise operators and product teams, with a strong focus on reliability, measurable outcomes, and long-term platform scalability. Our team is ${size} people and growing across engineering, product, and design.`,
    };
  });

  for (const company of companies) {
    await sql`
      INSERT INTO companies (id, owner_id, name, description)
      VALUES (${company.id}, ${company.ownerId}, ${company.name}, ${company.description})
      ON CONFLICT (id) DO UPDATE
      SET
        owner_id = EXCLUDED.owner_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description
    `;
  }

  console.log(`Companies seeded/upserted: ${companies.length}`);
}

try {
  await seedCompanies();
} finally {
  await closeSql();
}
