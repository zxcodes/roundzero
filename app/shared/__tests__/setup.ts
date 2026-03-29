import { afterAll, afterEach } from "vitest";
import { cleanTestData, closeTestDb } from "./test-utils";

/**
 * Global test setup file.
 *
 * Registered via vitest.config.ts `setupFiles`. Runs once per worker
 * (with isolate: false + maxWorkers: 1 that means once total).
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
