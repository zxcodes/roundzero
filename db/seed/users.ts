// @ts-nocheck
import { closeSql, copycat, makeUuid, pick, sql } from "./util";

const companyDomains = [
  "northstar.ai",
  "blueorbit.dev",
  "stridecloud.com",
  "forgepay.io",
  "meridianhealth.io",
  "latticeops.com",
  "pilotgrid.com",
  "canopydata.co",
  "heliocommerce.com",
  "summitlabs.io",
] as const;

async function seedUsers() {
  const users = [] as Array<{
    id: string;
    email: string;
    name: string;
    picture: string;
    role: "company" | "candidate";
    googleId: string;
  }>;

  for (let i = 1; i <= 20; i++) {
    const seed = `rz-seed-company-user-${i}`;
    const firstName = copycat.firstName(seed);
    const lastName = copycat.lastName(`${seed}-last`);
    const domain = pick(companyDomains, i);
    const id = makeUuid("rz-seed-company-user", i);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;

    users.push({
      id,
      email,
      name: `${firstName} ${lastName}`,
      picture: `https://i.pravatar.cc/300?img=${(i % 70) + 1}`,
      role: "company",
      googleId: `rz-seed-company-google-${i}`,
    });
  }

  for (let i = 1; i <= 20; i++) {
    const seed = `rz-seed-candidate-user-${i}`;
    const firstName = copycat.firstName(seed);
    const lastName = copycat.lastName(`${seed}-last`);
    const id = makeUuid("rz-seed-candidate-user", i);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@gmail.com`;

    users.push({
      id,
      email,
      name: `${firstName} ${lastName}`,
      picture: `https://i.pravatar.cc/300?img=${((i + 20) % 70) + 1}`,
      role: "candidate",
      googleId: `rz-seed-candidate-google-${i}`,
    });
  }

  for (const user of users) {
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

  console.log(`Users seeded/upserted: ${users.length}`);
}

try {
  await seedUsers();
} finally {
  await closeSql();
}
