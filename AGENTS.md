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
- **No logic in the database.** No triggers, functions, or stored procedures in migrations. Migrations are pure schema (tables, indexes, constraints). All logic (e.g. setting `updated_at`) must be handled in application code (SQLC queries).
- **No DB-level enums or CHECK constraints for enum-like values.** Use plain `TEXT` columns in the schema. Define and validate enums with Zod in `app/shared/enums.ts`. This keeps validation in one place (app code) and avoids migration headaches when values change.
- **Always set `updated_at = now()` explicitly** in every UPDATE query. There are no database triggers to do this automatically.
- **No down migrations.** Down migrations drop tables which means data loss. Always include `-- migrate:down` in migration files but keep the body empty.

## Local DB + Client

- Local dev uses Postgres via Docker.
- DB client uses `postgres` package (see `app/db.ts`).
- `.env` contains `DATABASE_URL` for local DB.

## TanStack Skills (IMPORTANT)

- **Always check TanStack Intent skills before implementing anything TanStack-specific** (routing, server functions, data loading, error boundaries, auth guards, etc.).
- Run `bunx @tanstack/intent@latest list` to discover available skills. There are 30+ skills across 11 packages covering routing, server functions, middleware, auth, error handling, and more.
- Read the relevant skill from `node_modules/@tanstack/<package>/skills/<skill>/SKILL.md` before writing code. These contain the canonical patterns, common mistakes, and cross-references.
- This is the source of truth for TanStack API usage — prefer skill guidance over guessing or using outdated patterns.
- **Always use `zodValidator()` from `@tanstack/zod-adapter`** for server function `inputValidator` calls. Never use manual `(data) => schema.parse(data)` callbacks. Example: `.inputValidator(zodValidator(mySchema))`.

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

- **Full setup**: `bun run setup.ts` (installs deps, copies `.env.example`, sets up Postgres, generates SQLC).
- Generate SQLC: `bun run sqlgen`.
- Run dev: `bun run dev`.
- Run tests: `bun run test`.
- Typecheck: `bun run typecheck`.
- Full check (lint + types): `bun run check`.
- DB setup (dev + test): `bash setup-db.sh setup_pg`.
- DB reset (dev + test): `bash setup-db.sh reset_pg`.
- DB remove: `bash setup-db.sh rm_pg`.

## Testing

- **Two separate Postgres containers**: dev (`hirely_pg`, port 6311) and test (`hirely_pg_test`, port 6312). Tests never touch dev data.
- **`TEST_DATABASE_URL`** in `.env` points to the test container. `test-utils.ts` reads this to create a separate Postgres client.
- **Run tests**: `bun run test`. This runs `vitest run` (Vitest 4).
- **Setup both DBs**: `bash setup-db.sh setup_pg` creates dev + test containers and migrates both.
- **Reset test DB only**: `bash setup-db.sh reset_pg` nukes and recreates the test container (never touches dev).
- **Global test setup** in `app/shared/__tests__/setup.ts` registers `afterEach(cleanTestData)` (TRUNCATE CASCADE) and `afterAll(closeTestDb)`. Individual test files must NOT add their own `afterEach`/`afterAll` hooks for cleanup — the global setup handles it.
- **Test helpers** in `app/shared/__tests__/test-utils.ts` — provides `getTestDb()`, `cleanTestData()`, `closeTestDb()`, and seed helpers (`seedUser`, `seedCompany`, `seedJob`).
- **File naming**: `<feature>.test.ts` (e.g. `auth.test.ts`, `jobs.test.ts`). Query-layer tests live in `queries/__tests__/`. Business logic / schema tests live in `__tests__/` at the feature level.
- **Always update relevant tests when changing features** — tests must stay in sync with queries, schemas, business logic, and server functions.
- **Test categories**:
  - **Query-layer tests** — test SQLC-generated queries against real Postgres (insert, select, update, constraint checks).
  - **Schema / validation tests** — test Zod schemas and extracted business logic (pure functions, no DB needed).
  - **Business logic tests** — test multi-step workflows against real DB (apply guards, status transitions, access control, metrics).
- **Vitest config** is in `vitest.config.ts` (separate from `vite.config.ts`). Uses `maxWorkers: 1`, `fileParallelism: false`, `isolate: false` so all test files share one DB connection.

## Code Conventions

- Never use handle for handler functions. Always use `on`, ex: `onClick` instead of `handleClick`
- Never write manual types for data returned by server functions or SQLC queries. Always use inferred types from the return values (e.g. `Route.useRouteContext()`, `Route.useLoaderData()`, `Awaited<ReturnType<...>>`).
- Always use `function` declarations for UI components and `const` declarations for non-ui functions.
- **Single `useId()` per component.** Call `useId()` once and derive all element IDs from it: `const id = useId(); const nameId = \`name-\${id}\`;`. Never call `useId()` multiple times in the same component.
- **No manual memoization.** React Compiler is enabled via `reactCompilerPreset()` in `vite.config.ts` and handles memoization automatically. Never use `useCallback`, `useMemo`, or `React.memo` — they are unnecessary and add noise.
- **All forms must use TanStack Form** (`@tanstack/react-form`). Use the shared `useAppForm` hook from `@/shared/form` which provides pre-bound field components (`TextField`, `NumberField`, `TextareaField`, `SelectField`) and form components (`SubmitButton`). Use `form.AppField` for simple fields and `form.Field` with `mode="array"` for array fields. Forms manage their own submit state internally via `SubmitButton` — never pass `isSubmitting` props from parent pages.
- **JSX conditional rendering: always use ternaries.** Write `{x ? (...) : null}` instead of `{x && (...)}`. This avoids accidentally rendering `0`, `""`, or `NaN` and keeps the pattern consistent across the codebase.
