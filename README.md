# RoundZero

AI-powered hiring platform that replaces the first round of hiring with structured, adaptive interviews and explainable candidate evaluations.

## Stack

- **Framework:** TanStack Start (React 19 with React Compiler, Vite 7)
- **Server:** TanStack Start + Nitro, running as a single Cloudflare Worker
- **AI:** Cloudflare Workflows + Durable Objects + Workers AI (in `app/`)
- **Models:** Workers AI (`@cf/zai-org/glm-4.7-flash` for interview chat)
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
cp .env.sample .env
# Fill in DATABASE_URL, EDGE_WORKER_SECRET, and other values

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
├── agents/          # Durable Object agent classes
├── workflows/       # Cloudflare Workflow classes
├── shared/          # Cross-cutting utilities (db, auth, middleware)
├── components/      # Global UI components + shadcn/ui
└── lib/             # Helpers (utils, theme)
```

## Documentation

- **[platform.md](platform.md)** — Product specification
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Technical architecture
- **[AGENTS.md](AGENTS.md)** — Agent/AI coding conventions
