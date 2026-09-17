# Contributing

## Setup

You need [Bun](https://bun.sh) 1.4+, Docker, and Git. Run [`setup.ts`](setup.ts) — that is the full local bootstrap:

```bash
bun run setup
```

Then fill in `.env` (at least `SESSION_SECRET` and `VITE_GOOGLE_CLIENT_ID` to sign in) and run:

```bash
bun run dev
```

Optional: `bun run db:seed` after signing up as a company in dev.

## Checks

```bash
bun run check   # format, lint, typecheck
bun run test    # Vitest (needs the test Postgres from setup)
```

Run `bun run check` before opening a PR. If you change `queries.sql` files, run `bun run sqlgen` (requires [sqlc](https://sqlc.dev)) and commit the generated `*_sql.ts`.

## Conventions

See [AGENTS.md](AGENTS.md) for project structure, server functions, entitlements, and UI rules. Product and architecture context: [PLATFORM.md](PLATFORM.md), [ARCHITECTURE.md](ARCHITECTURE.md), [AI-LAYER.md](AI-LAYER.md).
