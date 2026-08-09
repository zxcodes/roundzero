import { closeSql } from "./db/seed/util";
import { runCandidateSeed } from "./db/seed/seed";

try {
  await runCandidateSeed();
} catch (error) {
  console.error("\nCandidate seed failed:", error);
  process.exit(1);
} finally {
  await closeSql();
}
