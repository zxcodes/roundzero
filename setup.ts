import { existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { $ } from "bun";

const root = import.meta.dirname;
const envPath = resolve(root, ".env");
const envExamplePath = resolve(root, ".env.example");

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

const step = (n: number, label: string) =>
	console.log(`\n${bold(`[${n}/4]`)} ${label}`);

// ── 1. Install dependencies ──────────────────────────────────────────
step(1, "Installing dependencies...");
await $`bun install`;
console.log(green("  Dependencies installed."));

// ── 2. Copy .env.example → .env ─────────────────────────────────────
step(2, "Setting up environment variables...");
if (existsSync(envPath)) {
	console.log(yellow("  .env already exists — skipping copy."));
} else {
	copyFileSync(envExamplePath, envPath);
	console.log(green("  Copied .env.example -> .env"));
}

// ── 3. Setup Postgres (dev + test) ──────────────────────────────────
step(3, "Setting up Postgres containers (dev + test)...");
await $`bash setup-db.sh setup_pg`;
console.log(green("  Postgres containers running and migrated."));

// ── 4. Generate SQLC types ──────────────────────────────────────────
step(4, "Generating SQLC types...");
await $`bun run sqlgen`;
console.log(green("  SQLC types generated."));

// ── Done ─────────────────────────────────────────────────────────────
console.log(`
${green(bold("Setup complete!"))}

${bold("Next steps:")}

  ${cyan("1.")} Open ${bold(".env")} and replace the placeholder values:

     ${dim("SESSION_SECRET")}  — Generate one: ${dim("openssl rand -hex 32")}
     ${dim("VITE_GOOGLE_CLIENT_ID")}  — From Google Cloud Console
        ${dim("https://console.cloud.google.com/apis/credentials")}

  ${cyan("2.")} Start the dev server:

     ${dim("bun run dev")}

  ${cyan("3.")} (Optional) Seed the database with sample data:

     ${dim("bun run db:seed")}

  ${cyan("4.")} (Optional) Run the test suite:

     ${dim("bun run test")}
`);
