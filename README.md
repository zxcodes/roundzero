# RoundZero

AI-powered hiring platform that replaces first-round screening with structured async interviews, voice assessment, and explainable candidate reports.

Licensed under [MIT](LICENSE).

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
- **Linting & Formatting:** Oxlint + Oxfmt
- **Finding Unused Code & Dependencies:** Knip

## Prerequisites

- [Bun](https://bun.sh) 1.4+
- [Docker](https://docs.docker.com/get-docker/) (local Postgres)
- [sqlc](https://docs.sqlc.dev/en/latest/overview/install.html) (only if you change `queries.sql` files)

## Getting Started

Use [`setup.ts`](setup.ts) — do not install, copy env, or start Postgres by hand:

```bash
bun run setup
```

That installs dependencies, copies `.env.example` → `.env` if needed, starts Postgres (dev on `:6311`, test on `:6312`), and generates SQLC types.

Then edit `.env`:

1. Set `SESSION_SECRET` (`openssl rand -hex 32`)
2. Set `VITE_GOOGLE_CLIENT_ID` from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth client, authorized origin `http://localhost:3000`)
3. Keep the Polar placeholders if you are not testing billing. The app still expects those keys to be present.
4. Add `OPENROUTER_API_KEY` for interviews and evaluations. Leave ElevenLabs empty to skip voice.

```bash
bun run dev
```

Optional: sign up as a company, then `bun run db:seed` (or `bun run db:seed you@company.com`).

Self-hosting production also needs Cloudflare (Workers, Hyperdrive, R2, Email), Polar, and Sentry. Bindings and account IDs live in `wrangler.jsonc` — replace them with your own.

## Commands

| Command              | Description                            |
| -------------------- | -------------------------------------- |
| `bun run setup`      | Install, env, local Postgres, SQLC     |
| `bun run dev`        | Start dev server (port 3000)           |
| `bun run build`      | Production build                       |
| `bun run check`      | Format + lint + typecheck              |
| `bun run typecheck`  | TypeScript check only                  |
| `bun run sqlgen`     | Generate typed queries from SQL (SQLC) |
| `bun run db:migrate` | Run database migrations                |
| `bun run db:seed`    | Seed local demo data                   |
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
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Local setup and PR checks
- **[SECURITY.md](SECURITY.md)** — Vulnerability reports
