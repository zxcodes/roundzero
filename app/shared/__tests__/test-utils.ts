import postgres from "postgres";
import { appEnv } from "../env.app";

/**
 * Shared test database utilities.
 *
 * Uses a dedicated test database (TEST_DATABASE_URL) to avoid
 * wiping dev data. Falls back to a default rz_pg_test connection
 * if the env var is not set.
 */

const TEST_DATABASE_URL =
  appEnv.TEST_DATABASE_URL ??
  "postgres://postgres:password@localhost:6312/postgres?sslmode=disable";

let _sql: ReturnType<typeof postgres> | null = null;

/** Get the shared test database connection. */
export const getTestDb = () => {
  if (!_sql) {
    _sql = postgres(TEST_DATABASE_URL, {
      max: 5,
      onnotice: () => {},
    });
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
  await sql`
    TRUNCATE
      reports,
      interviews,
      job_batches,
      notifications,
      applications,
      jobs,
      candidate_profiles,
      companies,
      users
    CASCADE
  `;
};

// ─── Seed helpers ────────────────────────────────────────────────

export const makeTestResumeKey = (userId: string, fileName = "test-resume.pdf") =>
  `resumes/${userId}/00000000-0000-0000-0000-000000000000--${fileName.replace(/[^a-zA-Z0-9.-]+/g, "-").toLowerCase()}`;

interface TestUser {
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

interface TestCompany {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
}

/** Create a test company. Creates an owner user if ownerId not provided. */
export const seedCompany = async (overrides?: {
  ownerId?: string;
  name?: string;
  slug?: string;
  description?: string | null;
}): Promise<{ company: TestCompany; owner: TestUser }> => {
  const owner = overrides?.ownerId
    ? ({ id: overrides.ownerId } as TestUser)
    : await seedUser({ role: "company" });

  const sql = getTestDb();
  const name = overrides?.name ?? "Test Company";
  const slug =
    overrides?.slug ??
    `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
  const description = overrides?.description ?? null;

  const [row] = await sql`
    INSERT INTO companies (owner_id, name, slug, description)
    VALUES (${owner.id}, ${name}, ${slug}, ${description})
    RETURNING id, owner_id AS "ownerId", name, slug
  `;

  // Mirror production: every company has an `owner` membership row, which is
  // now the access-control primitive resolved by companyMiddleware.
  await sql`
    INSERT INTO company_members (company_id, user_id, role, status)
    VALUES (${(row as TestCompany).id}, ${owner.id}, 'owner', 'active')
  `;

  return { company: row as TestCompany, owner };
};

interface TestJob {
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

interface TestCandidateProfile {
  id: string;
  userId: string;
  headline: string | null;
}

/** Create a test candidate profile. Creates a candidate user if userId not provided. */
export const seedCandidateProfile = async (overrides?: {
  userId?: string;
  headline?: string | null;
  resumeKey?: string | null;
}): Promise<{ profile: TestCandidateProfile; user: TestUser }> => {
  const user = overrides?.userId
    ? ({ id: overrides.userId } as TestUser)
    : await seedUser({ role: "candidate" });

  const sql = getTestDb();
  const headline = overrides?.headline ?? "Software Engineer";
  const resumeKey = overrides?.resumeKey ?? makeTestResumeKey(user.id);

  const [row] = await sql`
    INSERT INTO candidate_profiles (user_id, headline, resume_key, onboarding_completed_at, resume_updated_at)
    VALUES (${user.id}, ${headline}, ${resumeKey}, now(), ${resumeKey ? new Date() : null})
    RETURNING id, user_id AS "userId", headline
  `;
  return { profile: row as TestCandidateProfile, user };
};
