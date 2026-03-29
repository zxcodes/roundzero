import postgres from "postgres";

/**
 * Shared test database utilities.
 *
 * Uses a dedicated test database (TEST_DATABASE_URL) to avoid
 * wiping dev data. Falls back to a default hirely_test connection
 * if the env var is not set.
 */

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:password@localhost:6312/postgres?sslmode=disable";

let _sql: ReturnType<typeof postgres> | null = null;

/** Get the shared test database connection. */
export const getTestDb = () => {
  if (!_sql) {
    _sql = postgres(TEST_DATABASE_URL, { max: 5 });
  }
  return _sql;
};

/** Close the database connection. Call in afterAll. */
export const closeTestDb = async () => {
  if (_sql) {
    await _sql.end();
    _sql = null;
  }
};

/** Delete all test data in correct FK order. Call in afterEach or afterAll. */
export const cleanTestData = async () => {
  const sql = getTestDb();
  await sql`TRUNCATE reports, interviews, applications, jobs, companies, users CASCADE`;
};

// ─── Seed helpers ────────────────────────────────────────────────

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
}

/** Create a test user. Returns the row. */
export const seedUser = async (overrides?: {
  email?: string;
  name?: string;
  role?: string | null;
  googleId?: string;
}): Promise<TestUser> => {
  const sql = getTestDb();
  const email = overrides?.email ?? `test-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const name = overrides?.name ?? "Test User";
  const role = overrides?.role ?? null;
  const googleId = overrides?.googleId ?? crypto.randomUUID();

  const [row] = await sql`
    INSERT INTO users (email, name, role, google_id)
    VALUES (${email}, ${name}, ${role}, ${googleId})
    RETURNING id, email, name, role
  `;
  return row as TestUser;
};

export interface TestCompany {
  id: string;
  ownerId: string;
  name: string;
}

/** Create a test company. Creates an owner user if ownerId not provided. */
export const seedCompany = async (overrides?: {
  ownerId?: string;
  name?: string;
  description?: string | null;
}): Promise<{ company: TestCompany; owner: TestUser }> => {
  const owner = overrides?.ownerId
    ? ({ id: overrides.ownerId } as TestUser)
    : await seedUser({ role: "company" });

  const sql = getTestDb();
  const name = overrides?.name ?? "Test Company";
  const description = overrides?.description ?? null;

  const [row] = await sql`
    INSERT INTO companies (owner_id, name, description)
    VALUES (${owner.id}, ${name}, ${description})
    RETURNING id, owner_id AS "ownerId", name
  `;
  return { company: row as TestCompany, owner };
};

export interface TestJob {
  id: string;
  companyId: string;
  title: string;
  status: string;
}

/** Create a test job. Creates a company (and owner) if companyId not provided. */
export const seedJob = async (overrides?: {
  companyId?: string;
  title?: string;
  status?: string;
}): Promise<{ job: TestJob; companyId: string }> => {
  let companyId = overrides?.companyId;
  if (!companyId) {
    const { company } = await seedCompany();
    companyId = company.id;
  }

  const sql = getTestDb();
  const title = overrides?.title ?? "Test Job";
  const status = overrides?.status ?? "draft";

  const [row] = await sql`
    INSERT INTO jobs (company_id, title, description, status)
    VALUES (${companyId}, ${title}, ${"Test description"}, ${status})
    RETURNING id, company_id AS "companyId", title, status
  `;
  return { job: row as TestJob, companyId };
};
