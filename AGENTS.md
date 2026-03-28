# Agent Notes

## Key References

- **`PLATFORM.md`** — Product specification. Read this first to understand what Hirely does, the user types, system flow, agent architecture, interview mechanics, report structure, and MVP scope.
- **`ARCHITECTURE.md`** — Technical architecture. Covers stack, deployment, directory structure, database schema, agent design (InterviewAgent + EvaluationAgent), AI model strategy, auth flow, file storage, and phased build plan.

Always consult both files before making design decisions or implementing new features. They are the source of truth for product behavior and technical implementation.

## Project Structure

- Use feature-first folders: `app/features/<feature>/` with `routes/`, `components/`, `hooks/`, `queries/`, `services/`, `types.ts`.
- Keep shared utilities in `app/shared/` (db, auth, server middleware, UI helpers).
- File-based routes must live in `app/routes/` and can re-export feature components.
- No barrel exports (no `index.ts` re-export files).

## Database + SQLC

- Migrations use dbmate with a single init migration in `db/migrations/`.
- Full schema lives in `db/init.sql` and `db/schema.sql` (no pg_dump headers).
- SQLC is the source of typed query functions; do not hand-edit `*_sql.ts` outputs.
- Do not write manual types for DB data; use SQLC-generated types only.
- Never use type assertions in application code. Always infer from server function response.
- SQLC config is in `sqlc.yaml` with per-feature query files.

## Local DB + Client

- Local dev uses Postgres via Docker.
- DB client uses `postgres` package (see `app/db.ts`).
- `.env` contains `DATABASE_URL` for local DB.

## Tooling

- Linting: Biome (`biome.json`).
- Typecheck: `bun run typecheck`.
- Ignore SQLC outputs in lint/typecheck:
  - Biome: `!**/app/**/*_sql.ts`
  - TS: `"exclude": ["app/**/*_sql.ts"]` in `tsconfig.json`.
- Always check the latest framework docs and prefer official utilities over custom helpers.
- Avoid unnecessary utilities or files unless shared across multiple places.

## UI

- Always use shadcn UI components when applicable.

## Commands

- Generate SQLC: `bun run sqlgen`.
- Run dev: `bun run dev`.
- Typecheck: `bun run typecheck`.
- Full check (lint + types): `bun run check`.
- DB migrate: `pnpm dbmate --url $DATABASE_URL migrate up` (see `setup-db.sh`).

## Code Conventions

- Never use handle for handler functions. Always use `on`, ex: `onClick` instead of `handleClick`
- Never write manual types for data returned by server functions or SQLC queries. Always use inferred types from the return values (e.g. `Route.useRouteContext()`, `Route.useLoaderData()`, `Awaited<ReturnType<...>>`).
- Always use `function` declarations for UI components and `const` declarations for non-ui functions.
