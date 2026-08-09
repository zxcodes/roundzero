import { closeSql } from "./db/seed/util";
import { runCompanySeed } from "./db/seed/seed";

try {
  await runCompanySeed();
} catch (error) {
  console.error("\nSeed failed:", error);
  process.exit(1);
} finally {
  await closeSql();
}
