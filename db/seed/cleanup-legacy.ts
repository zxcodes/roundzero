// @ts-nocheck
import { closeSql, sql } from "./util";

async function cleanupLegacySeedData() {
  const legacyUsers = await sql<{ id: string }[]>`
    SELECT id
    FROM users
    WHERE google_id LIKE 'seed-google-%'
  `;

  if (legacyUsers.length === 0) {
    console.log("Legacy seed cleanup: nothing to remove.");
    return;
  }

  await sql`
    DELETE FROM users
    WHERE google_id LIKE 'seed-google-%'
  `;

  console.log(`Legacy seed cleanup removed users: ${legacyUsers.length}`);
}

try {
  await cleanupLegacySeedData();
} finally {
  await closeSql();
}
