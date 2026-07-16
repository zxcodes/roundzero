import { afterAll, afterEach } from "vitest";

import { cleanTestData, closeTestDb } from "./test-utils";

/**
 * Global test setup file.
 *
 * Registered via vitest.config.ts `setupFiles`. Test files remain isolated,
 * while maxWorkers: 1 keeps their shared Postgres cleanup sequential.
 *
 * - afterEach: truncate all test data so each test starts clean
 * - afterAll: close the DB connection when all tests are done
 */

afterEach(async () => {
  await cleanTestData();
});

afterAll(async () => {
  await closeTestDb();
});
