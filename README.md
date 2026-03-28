# Hirely

AI-powered hiring PLATFORM that replaces the first round of hiring with structured, adaptive interviews and explainable candidate evaluations.

## Stack

- **Framework:** TanStack Start (React 19, Vite 7)
- **Server:** Cloudflare Workers
- **Database:** Postgres (Neon prod, Docker local) + SQLC
- **AI Agents:** Cloudflare Agents SDK (Durable Objects)
- **AI Models:** Vercel AI SDK (OpenAI, Anthropic, Workers AI)
- **UI:** shadcn/ui, Tailwind CSS v4, Phosphor Icons
- **Linting:** Biome

## Getting Started

```bash
# Install dependencies
bun install

# Set up local Postgres (requires Docker)
bash setup-db.sh setup_pg

# Copy env template
cp .env.example .env
# Fill in DATABASE_URL and other values

# Run dev server
bun run dev
```

## Commands

| Command              | Description                            |
| -------------------- | -------------------------------------- |
| `bun run dev`        | Start dev server on port 3000          |
| `bun run build`      | Production build                       |
| `bun run check`      | Lint (Biome) + typecheck               |
| `bun run typecheck`  | TypeScript check only                  |
| `bun run sqlgen`     | Generate typed queries from SQL (SQLC) |
| `bun run db:migrate` | Run database migrations                |

## Project Structure

```
src/
├── routes/          # TanStack file-based routes
├── features/        # Feature modules (auth, jobs, interviews, reports, etc.)
├── agents/          # Cloudflare Agents (InterviewAgent, EvaluationAgent)
├── shared/          # Cross-cutting utilities (db, auth, middleware)
├── components/      # Global UI components + shadcn/ui
└── lib/             # Helpers (utils, theme)
```

## Documentation

- **[PLATFORM.md](PLATFORM.md)** — Product specification
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Technical architecture
- **[AGENTS.md](AGENTS.md)** — Agent/AI coding conventions
