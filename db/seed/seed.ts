// @ts-nocheck
import { $ } from "bun";

console.log("Starting RoundZero seed pipeline...\n");

try {
  await $`bun ./db/seed/users.ts`;
  await $`bun ./db/seed/companies.ts`;
  await $`bun ./db/seed/candidate-profiles.ts`;
  await $`bun ./db/seed/jobs.ts`;
  await $`bun ./db/seed/applications.ts`;
  await $`bun ./db/seed/notifications.ts`;
  await $`bun ./db/seed/interviews.ts`;
  await $`bun ./db/seed/reports.ts`;
  await $`bun ./db/seed/company-dashboard.ts`;

  console.log("\nSeed pipeline completed successfully.");
} catch (error) {
  console.error("\nSeed pipeline failed:", error);
  process.exit(1);
}
