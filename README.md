# RoundZero

AI-powered hiring platform that replaces the first round of hiring with structured, adaptive interviews and explainable candidate evaluations.

## Stack

- **Framework:** TanStack Start (React 19 with React Compiler, Vite 7)
- **Server:** TanStack Start + Nitro (main app), Cloudflare Workers (AI edge)
- **AI:** Cloudflare Workflows + Durable Objects + Workers AI (in `edge/`)
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

# Copy env templates
cp .env.sample .env
cp edge/.env.sample edge/.env
# Fill in DATABASE_URL, EDGE_WORKER_URL, EDGE_WORKER_SECRET, and other values in both files

# Run both dev servers (main app + edge Worker)
bun run dev
```

## Commands

| Command              | Description                            |
| -------------------- | -------------------------------------- |
| `bun run dev`        | Start main app (port 3000) + edge Worker (port 8787) |
| `bun run dev:app`    | Start main app only on port 3000       |
| `bun run dev:edge`   | Start edge Worker only on port 8787    |
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
├── shared/          # Cross-cutting utilities (db, auth, middleware)
├── components/      # Global UI components + shadcn/ui
└── lib/             # Helpers (utils, theme)

edge/
├── src/
│   ├── index.ts     # Worker entrypoint (Hono HTTP server)
│   ├── workflows/   # Cloudflare Workflow classes
│   ├── agents/      # Durable Object agent classes
│   └── queries/     # SQLC-generated query files
```

## Documentation

- **[platform.md](platform.md)** — Product specification
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Technical architecture
- **[AGENTS.md](AGENTS.md)** — Agent/AI coding conventions
