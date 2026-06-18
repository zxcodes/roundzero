# RoundZero 

AI-powered hiring platform that replaces the first round of hiring with structured, adaptive interviews and explainable candidate evaluations.

## Stack

- **Framework:** TanStack Start (React 19 with React Compiler, Vite 8)
- **Runtime:** Cloudflare Worker (Workflows, scheduled handlers)
- **AI:** OpenRouter via AI SDK v6 + Cloudflare Workflows (in `app/workflows/`)
- **Billing:** Polar subscriptions with plan-gated entitlements
- **Models:** OpenRouter (Claude Haiku/Sonnet in prod; free Llama/Qwen/GPT-OSS in dev)
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
# Fill in DATABASE_URL, and other values

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

## Project Structure

```
app/
├── routes/          # TanStack file-based routes
├── features/        # Feature modules (auth, jobs, applications, etc.)
├── workflows/       # Cloudflare Workflow classes
├── shared/          # Cross-cutting utilities (db, auth, middleware)
├── components/      # Global UI components + shadcn/ui
└── lib/             # Helpers (utils, theme)
```

## Documentation

- **[PLATFORM.md](PLATFORM.md)** — Product specification
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Technical architecture
- **[AGENTS.md](AGENTS.md)** — Agent/AI coding conventions
