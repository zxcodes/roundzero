// @ts-nocheck
import { createHash } from "node:crypto";
import { copycat } from "@snaplet/copycat";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("MISSING DATABASE_URL ENV");
}

export const sql = postgres(databaseUrl, {
  max: 4,
});

export async function closeSql() {
  await sql.end({ timeout: 0 });
}

export { copycat };

export function makeUuid(namespace: string, index: number): string {
  return makeUuidFromSeed(`${namespace}-${index}`);
}

export function makeUuidFromSeed(seed: string): string {
  const digest = createHash("sha256")
    .update(seed)
    .digest("hex")
    .slice(0, 32)
    .split("");

  digest[12] = "4";
  digest[16] = ((Number.parseInt(digest[16]!, 16) & 0x3) | 0x8).toString(16);

  return [
    digest.slice(0, 8).join(""),
    digest.slice(8, 12).join(""),
    digest.slice(12, 16).join(""),
    digest.slice(16, 20).join(""),
    digest.slice(20, 32).join(""),
  ].join("-");
}

export function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length]!;
}

export function randomInt(seed: string, min: number, max: number): number {
  return copycat.int(seed, { min, max });
}

export function clampScore(value: number): number {
  return Math.max(1, Math.min(10, value));
}

export type DevUser = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  role: "company" | "candidate";
};

/** Real dev accounts created via Google sign-in — excludes synthetic rz-seed users. */
export async function loadDevUser(
  role: "company" | "candidate",
  email?: string,
): Promise<DevUser | null> {
  if (email) {
    const rows = await sql<DevUser[]>`
      SELECT id, email, name, picture, role
      FROM users
      WHERE email = ${email}
        AND role = ${role}
        AND deleted_at IS NULL
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  const rows = await sql<DevUser[]>`
    SELECT id, email, name, picture, role
    FROM users
    WHERE role = ${role}
      AND deleted_at IS NULL
      AND (google_id IS NULL OR google_id NOT LIKE 'rz-seed-%')
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}
