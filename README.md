# RoundZero

AI-powered hiring platform that replaces first-round screening with structured async interviews, voice assessment, and explainable candidate reports.

## Stack

- **Framework:** TanStack Start (React 19 with React Compiler, Vite 8)
- **Runtime:** Cloudflare Worker (Workflows + scheduled handlers)
- **Database:** Postgres via Hyperdrive (local Docker for dev/test)
- **AI:** OpenRouter via Vercel AI SDK v7 + TanStack AI (`@tanstack/ai-openrouter` for text interviews)
- **Workflows:** Cloudflare Workflows — pre-eval, post-eval, batch orchestration, pool-check, eval-retry, account-cleanup
- **Voice:** ElevenLabs Conversational AI (signed URL + `@elevenlabs/client`)
- **Billing:** Polar subscriptions with plan-gated entitlements
- **Models:** Code-level chains in `app/shared/openrouter.ts` — Sonnet/Haiku in prod; free/OpenRouter models in dev
- **Storage:** Cloudflare R2 (resumes, voice audio)
- **Email:** Cloudflare Email Service (secondary to in-app notifications)
- **UI:** shadcn/ui, Tailwind CSS v4, Huge Icons
- **Linting & Formatting:** Biome
- **Finding Unused Code & Dependencies:** Knip

## Getting Started

```bash
# Install dependencies
bun install

# Set up local Postgres (requires Docker)
bash setup-db.sh setup_pg

# Copy env template
cp .env.example .env
# Fill in DATABASE_URL, OPENROUTER_API_KEY, and other values

# Start dev server
bun run dev
```

## Commands

| Command              | Description                            |
| -------------------- | -------------------------------------- |
| `bun run dev`        | Start dev server (port 3000)           |
| `bun run build`      | Production build                       |
| `bun run check`      | Lint (Biome) + typecheck               |
| `bun run typecheck`  | TypeScript check only                  |
| `bun run sqlgen`     | Generate typed queries from SQL (SQLC) |
| `bun run db:migrate` | Run database migrations                |
| `bun run test`       | Run Vitest suite                       |

## Project Structure

```
app/
├── routes/          # TanStack file-based routes
├── features/        # Feature modules (auth, jobs, applications, accounts, etc.)
├── workflows/       # Cloudflare Workflow classes
├── shared/          # Cross-cutting utilities (db, auth, openrouter, middleware)
├── components/      # Global UI components + shadcn/ui
└── server.ts        # Worker entrypoint (fetch + scheduled crons)
```

## Documentation

- **[PLATFORM.md](PLATFORM.md)** — Product specification
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Technical architecture
- **[AI-LAYER.md](AI-LAYER.md)** — AI funnel, interviews, evaluation, batching
- **[AGENTS.md](AGENTS.md)** — Agent/AI coding conventions