# Agent Notes

## Key References

- **`PLATFORM.md`** — product spec (what RoundZero does, flow, agents, interviews, reports, billing, MVP scope).
- **`ARCHITECTURE.md`** — tech architecture (stack, deployment, directory structure, DB schema, auth, storage).
- **`AI-LAYER.md`** — AI layer reference. Read before any AI implementation.

## Performance (Cloudflare Workers) — read before touching routes/loaders

Every client-side server-function call is a real worker round trip (+ an `authMiddleware` DB hit). Locally these run in-process and are free, so perf bugs only surface in prod. Minimize round trips.

- **Never fetch data in `beforeLoad`.** It re-runs on every preload (`defaultPreload: "intent"`) and every navigation, and is **not** SWR-cached — so it fans out into many serialized round trips. Keep `beforeLoad` cheap: auth/role checks, redirects, `validateUuidParams`. Fetch in `loader` (SWR-cached by `staleTime`/`defaultPreloadStaleTime`).
- **One server fn per loader phase.** Consolidate related reads into a single server function (one auth-middleware run, parallel queries inside) instead of calling 2–3 separate fns from the same route.
- **If you truly need expensive data in `beforeLoad`** (app-wide auth/entitlement context), cache it via `context.queryClient.fetchQuery({ queryKey, queryFn, staleTime })` — as `__root` does for the user and `_authenticated` does for the company bootstrap.
- Router caching is global in `app/router.tsx` (`defaultStaleTime`, `defaultPreloadStaleTime`). Mutations must call `router.invalidate()` (overrides `staleTime`) to refresh after writes.

## Billing & Entitlements

- `deriveEntitlements()` in `app/features/entitlements/entitlements.ts` is the single source of truth; plan config in `app/features/billing/config.ts`.
- Server mutations gate via `readCompanyEntitlements()` / `enforceCompanyEntitlement(db, companyId, ...)` — never trust loader/router snapshots. UI gating reads `_authenticated` context via `useEntitlements()`.
- Report targets via `enforceReportTarget()`. Active jobs = `open` only (drafts are free). Team seats = non-owner members + pending invites.

## Project Structure & Code Quality

- Feature-first: `app/features/<feature>/{routes,components,hooks,queries,server/functions.ts,types.ts}`. Shared in `app/shared/`, file-based routes in `app/routes/`. Don't add files/abstractions unless reused.
- No barrel exports (`index.ts` re-exports). No thin wrappers — inline single-call logic; extract only real logic shared across features.
- Date formatting: only `@/shared/date` helpers (`formatDate`, `formatRelativeTime`, etc.), never inline `toLocaleString`/`toLocaleDateString`.
- Early returns everywhere. Use `isDev`/`isProd`/`isStaging` from `app/shared/env.app.ts`, not raw `process.env.NODE_ENV`.

## Database + SQLC

- Ordered dbmate migrations in `db/migrations/`; `db/schema.sql` is the dbmate-generated dump (never hand-edit). Staging/prod are deployed — never edit an already-applied migration. New change: `dbmate new <name>` (empty `migrate:down` body), `bunx dbmate up`, then `bun run sqlgen`.
- SQLC generates `*_sql.ts` — never hand-edit. Use generated types or infer from server-fn/loader responses; never re-declare row/payload shapes, no type assertions.
- Pure schema only: no triggers/functions/procedures, no DB enums (use `TEXT` + Zod in `app/shared/enums.ts`). Set `updated_at = now()` explicitly in every UPDATE.
- Decimals: use `DOUBLE PRECISION`, never `NUMERIC`/`DECIMAL` — the `postgres` driver returns NUMERIC as strings (OID 1700 isn't parsed as a number) even though SQLC types it `number`, which silently breaks numeric reads.
- JSONB: pass/read raw JS values; never `JSON.stringify`/`JSON.parse` (the `postgres` driver handles it — pre-stringifying double-encodes).
- Local Postgres via Docker; `postgres` client (`app/shared/db.ts`), `DATABASE_URL` in `.env`.

## Server Functions + Route Loaders

- Server fns return `null` for not-found resources (loaders throw `notFound()`). `throw new Error()` only for auth/authorization failures — never conflate the two (404 page vs error boundary).
- Validate UUID path params in `beforeLoad` with `validateUuidParams()` (merge with auth checks).
- Loaders check `null` → `throw notFound()` immediately after the call. Never `.catch(() => notFound())` (swallows real errors). No per-route `notFoundComponent` — the global one in `@/components/not-found.tsx` handles 404s.
- Use discriminated unions in loaders when data varies by user type — no `null` companion fields. Narrow nullable server fns: `type X = NonNullable<Awaited<ReturnType<typeof fn>>>`.
- Branch loaders to fetch only what each path needs; no `Promise.all([cond ? fetch() : Promise.resolve(null)])` placeholder hacks.

## TanStack

- Check Intent skills first: `bunx @tanstack/intent@latest list`.
- `validator`: use `zodValidator()` from `@tanstack/zod-adapter`, never manual `.parse()`.
- Forms: `useAppForm` from `@/shared/form` (`TextField`, `TextareaField`, `SelectField`, `SubmitButton`); `form.AppField`, `form.Field mode="array"`. Forms own submit state — don't pass `isSubmitting`.
- Numeric inputs: use `TextField` with string defaults (not `NumberField`/`type=number`), convert to `number | null` in `onSubmit`, validate on blur. Cross-field checks go in form-level `validators.onSubmit` returning `{ fields: {...} }`.

## UI

- Always use shadcn components over hand-rolled divs/buttons (`Card`, `Button`, `Empty`, etc.). Empty states via `@app/components/ui/empty.tsx`.
- Icons: `@hugeicons/react` + `@hugeicons/core-free-icons` only (no Lucide/Phosphor).
- React Compiler is on — never `useCallback`/`useMemo`/`React.memo`. One `useId()` per component, derive IDs.
- Conditionals: `{x ? (...) : null}`, never `{x && (...)}`. No inline event handlers — define `on*` handlers in scope. `function` for UI components, `const` for non-UI.
- `ScrollArea` (with explicit `h-`) for contained scroll panels; keep native scroll for page content/sidebars/textareas.
- All `pendingComponent` skeletons live in `app/components/route-skeletons.tsx` — keep them in sync with layouts. Every route with a `loader` needs one.

## Tooling

- Biome lint (`biome.json`); SQLC outputs excluded. **Run `bun run check` (lint + types) after every change.**
- `bun run dev` | `bun run sqlgen` | `bun run test` | `bun run setup.ts`. DB: `bash setup-db.sh setup_pg|reset_pg|rm_pg`.

## Cloudflare + AI

- Use the Cloudflare docs MCP for Workers/Workflows/DO/R2/AI/bindings questions — don't rely on memory.
- Structured outputs: Zod `.strict()` + `generateObject()`; add Response Healing (`{ plugins: [{ id: "response-healing" }] }`); never prompt "respond with JSON". Model selection lives in `app/shared/openrouter.ts` (code-level, no env var).
- Workers constraints: no filesystem (except `/tmp` with `nodejs_compat`), no `process.env` (use bindings), all I/O inside `step.do()`. Never guess runtime behavior — verify.

## Testing

- Dev (`rz_pg_dev:6311`) + test (`rz_pg_test:6312`) Postgres; `TEST_DATABASE_URL` in `.env`. Config in `vitest.config.ts`.
- Global setup (`app/shared/__tests__/setup.ts`) handles cleanup — don't add per-test cleanup hooks. Helpers in `test-utils.ts` (`getTestDb`, `cleanTestData`, `seedUser/Company/Job`).
- `<feature>.test.ts`; queries in `queries/__tests__/`, logic in `__tests__/`. Update tests when changing features.

## Git Commits

- No AI/tool attribution footers; no co-authored-by/generated-by boilerplate unless explicitly requested.
