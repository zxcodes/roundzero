# Agent Notes

## Key References

- **`PLATFORM.md`** — Product spec (what RoundZero does, user types, flow, agents, interviews, reports, MVP scope).
- **`ARCHITECTURE.md`** — Tech architecture (stack, deployment, directory structure, DB schema, AI models, auth, storage, build phases).

Always consult both before making design decisions or implementing features.

## Project Structure

- Feature-first folders: `app/features/<feature>/` with `routes/`, `components/`, `hooks/`, `queries/`, `services/`, `types.ts`.
- Shared utilities in `app/shared/`. File-based routes in `app/routes/`.
- No barrel exports (`index.ts` re-export files).

## Database + SQLC

- Single init migration in `db/migrations/` via dbmate. Schema in `db/init.sql` and `db/schema.sql`.
- SQLC generates typed query functions — never hand-edit `*_sql.ts`. Config in `sqlc.yaml`.
- No manual DB/data shape types — use SQLC-generated types or infer from server function / loader responses. Do not re-declare row or payload shapes in components when the type already exists upstream.
- No type assertions — infer from server function responses.
- **No DB logic** — no triggers, functions, or stored procedures. Pure schema only.
- **No DB enums/CHECKs** — use `TEXT` columns. Validate with Zod in `app/shared/enums.ts`.
- **No down migrations** — include `-- migrate:down` but keep body empty.
- **Set `updated_at = now()` explicitly** in every UPDATE query (no triggers).
- **JSONB: never use `JSON.stringify()` or `JSON.parse()`.** The `postgres` driver handles serialization both ways automatically. Pass raw JS objects/arrays when writing, and read JSONB columns as plain JS values. Pre-stringifying causes double-encoding (`"\"[...]\""`), and parsing the read side breaks already-decoded values.

## Local DB

- Postgres via Docker. Client uses `postgres` package (`app/db.ts`). `DATABASE_URL` in `.env`.

## TanStack

- **Check TanStack Intent skills first** — run `bunx @tanstack/intent@latest list`, read `node_modules/@tanstack/<package>/skills/<skill>/SKILL.md`.
- **Use `zodValidator()` from `@tanstack/zod-adapter`** for `inputValidator`. Never use manual `schema.parse()` callbacks.
- **All forms use TanStack Form** via `useAppForm` from `@/shared/form` (provides `TextField`, `NumberField`, `TextareaField`, `SelectField`, `SubmitButton`). Use `form.AppField` for simple fields, `form.Field` with `mode="array"` for arrays. Forms manage submit state internally — never pass `isSubmitting` from parents.

## UI

- Always use shadcn components. Icons: `@hugeicons/react` + `@hugeicons/core-free-icons` (no Lucide, no Phosphor).
- **No manual memoization** — React Compiler is enabled. Never use `useCallback`, `useMemo`, `React.memo`.
- **Single `useId()` per component** — call once, derive IDs: `` const id = useId(); const nameId = `name-${id}`; ``
- **Ternaries for conditionals** — `{x ? (...) : null}`, never `{x && (...)}`.
- `function` declarations for UI components, `const` for non-UI. `on` prefix for handlers (not `handle`).

## Tooling + Commands

- Lint: Biome (`biome.json`). SQLC outputs excluded from lint/typecheck.
- `bun run setup.ts` — full setup | `bun run dev` — dev server | `bun run sqlgen` — generate SQLC
- `bun run test` — tests | `bun run typecheck` — types | `bun run check` — lint + types
- `bash setup-db.sh setup_pg` — create dev+test DBs | `bash setup-db.sh reset_pg` — reset both | `bash setup-db.sh rm_pg` — remove

## Testing

- Two Postgres containers: dev (`rz_pg_dev:6311`) and test (`rz_pg_test:6312`). Tests never touch dev.
- `TEST_DATABASE_URL` in `.env`. Vitest 4 config in `vitest.config.ts` (`maxWorkers: 1`, `fileParallelism: false`, `isolate: false`).
- Global setup in `app/shared/__tests__/setup.ts` handles `afterEach(cleanTestData)` + `afterAll(closeTestDb)` — individual tests must NOT add their own cleanup hooks.
- Helpers in `app/shared/__tests__/test-utils.ts`: `getTestDb()`, `cleanTestData()`, `closeTestDb()`, `seedUser`, `seedCompany`, `seedJob`.
- File naming: `<feature>.test.ts`. Query tests in `queries/__tests__/`, business logic in `__tests__/`.
- Always update tests when changing features. Test categories: query-layer (real DB), schema/validation (pure), business logic (multi-step workflows).
