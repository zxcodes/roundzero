# Agent Notes

## Key References

- **`PLATFORM.md`** — Product spec (what RoundZero does, user types, flow, agents, interviews, reports, billing, MVP scope).
- **`ARCHITECTURE.md`** — Tech architecture (stack, deployment, directory structure, DB schema, AI models, auth, storage, build phases).
- **`AI-LAYER.md`** — AI Layer high level reference. This must be checked before starting AI implementation.

Always consult both before making design decisions or implementing features.

## Billing & Entitlements

- Plan config and marketing copy: `app/features/billing/config.ts` (`PLAN_CONFIGS`).
- Single source of truth: `deriveEntitlements()` in `app/features/entitlements/entitlements.ts`.
- Server mutations must use `readCompanyEntitlements()` / `enforceCompanyEntitlement(db, companyId, ...)` — never trust stale loader/router snapshots for gating.
- UI gating reads from `_authenticated` route context via `useEntitlements()`.
- Report targets: `enforceReportTarget()` (strict on user input, clamp on publish/downgrade).
- Active jobs = `open` status only; drafts never consume a slot. Team seats count non-owner members + pending invites (owner excluded).

## Project Structure & Code Quality

- Feature-first folders: `app/features/<feature>/` with `routes/`, `components/`, `hooks/`, `queries/`, `server/functions.ts`, `types.ts`.
- Shared utilities in `app/shared/`. File-based routes in `app/routes/`. DO NOT ADD THESE IF THEY ARE NOT REUSED.
- No barrel exports (`index.ts` re-export files).
- **No thin wrappers or trivial abstractions.** Don't create helper functions that just forward to another function with renamed args, add a null check, or wrap a single call. Inline the logic at the call site instead. Only extract a shared helper when it contains real logic and is used across multiple features.
- **Use `@/shared/date` for all date formatting.** Never write inline `toLocaleDateString("en-US", ...)` or `new Date(...).toLocaleString(...)` in components. The module exports `formatDate`, `formatDateShort`, `formatDateTime`, `formatDateTimeUtc`, `formatRelativeTime`, `formatTimeLeft`, and `formatDeadlineLabel` using `date-fns` as the single source of truth.
- Always use early returns in functions when possible. This applies to both UI components and server functions.
- Always use constants (isDev, isProd, isStaging from `app/shared/env.app.ts` instead of manually doing `process.env.NODE_ENV` where relevant.)

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
- New migrations should always be created using `dbmate new <migration_name>`. No manual timestamp based migrations.
- New migrations should not have migrate down block. We don't do down migrations.

## Server Functions + Route Loaders

- **Server functions return `null` for not-found resources.** Never `throw new Error("...not found")`. Return `null` so loaders can distinguish "doesn't exist" (→ `notFound()`) from real errors (→ error boundary). Auth/authorization errors (e.g. "Only candidates can view", "Not authorized to view this applicant") still `throw new Error()`. Do not conflate auth violations with not-found — they have different UI outcomes (error boundary vs 404 page).
- **Validate UUID params in `beforeLoad`.** Routes with UUID path params (`$jobId`, `$applicationId`, etc.) must validate them in `beforeLoad` using `validateUuidParams()` from `@/shared/validation`. This catches invalid formats (e.g. `xxxid`) before the server function's Zod `validator` throws a generic error:
  ```ts
  beforeLoad: ({ params }) => {
    validateUuidParams({ jobId: params.jobId });
  },
  ```
  Merge with existing `beforeLoad` logic (auth checks, etc.) in a single function.
- **Loaders check for `null` and throw `notFound()`.** This is the only place `notFound()` is thrown — right after the server function call:
  ```ts
  const job = await getJob({ data: { id: params.jobId } });
  if (!job) throw notFound();
  ```
- **Never use `.catch(() => throw notFound())`.** This swallows all errors (network, auth, 500s) and shows a "not found" page. Always check the return value instead.
- **No per-route `notFoundComponent`.** The global `NotFound` component in `@/components/not-found.tsx` handles all 404s uniformly. Don't create route-specific not-found components.
- **Discriminated unions in loaders** when data varies by user type. Each branch returns only its own data — no `null` companion fields:
  ```ts
  // ✅ Good
  loader: async ({ context }) => {
    if (context.isCompany) {
      const company = await getMyCompany();
      if (!company) throw redirect({ to: "/onboarding/company" });
      return { type: "company" as const, company };
    }
    const profile = await getMyCandidateProfile();
    if (!profile) throw redirect({ to: "/onboarding/candidate" });
    return { type: "candidate" as const, profile };
  }
  // ❌ Bad — null companion fields bloat the type and force ! assertions
  return { type: "company", company, profile: null }
  ```
- **Type narrowing for nullable server functions.** When a loader guarantees non-null data after a `notFound()` check, define a `NonNullable<>` type alias for use in components:
  ```ts
  type JobDetail = NonNullable<Awaited<ReturnType<typeof getJob>>>;
  ```
- **Conditional fetching, not `Promise.all` hacks.** Never use `Promise.all([condition ? fetch() : Promise.resolve(null), ...])` with placeholder values. Branch the loader and fetch only what each branch needs.

## TanStack

- **Check TanStack Intent skills first** — run `bunx @tanstack/intent@latest list`, read `node_modules/@tanstack/<package>/skills/<skill>/SKILL.md`.
- **Use `zodValidator()` from `@tanstack/zod-adapter`** for `validator`. Never use manual `schema.parse()` callbacks.
- **All forms use TanStack Form** via `useAppForm` from `@/shared/form` (provides `TextField`, `NumberField`, `TextareaField`, `SelectField`, `SubmitButton`). Use `form.AppField` for simple fields, `form.Field` with `mode="array"` for arrays. Forms manage submit state internally — never pass `isSubmitting` from parents.
- **Never use `NumberField` (type="number") for numeric inputs.** It renders spinner arrows which look bad. Use `TextField` with string defaults instead, and convert to `number | null` in `onSubmit`:
  - Default: `salaryMin: defaultValues?.salaryMin != null ? String(defaultValues.salaryMin) : ""`
  - Submit: `salaryMin: value.salaryMin ? Number(value.salaryMin) : null`
  - Add `onBlur` validation via a helper (e.g. `positiveIntBlur`) or inline Zod schema to catch non-numeric input.
  - For cross-field validation (e.g. salaryMin ≤ salaryMax), use form-level `validators.onSubmit` returning `{ fields: { fieldName: "error message" } }`.
- **Client-side form validation** — use `validators={{ onBlur: z.string().trim().min(1, "...").max(N, "...") }}` on required fields for instant, user-friendly errors. Put numeric/string format validation on blur too. Cross-field checks go on the form's `validators`.

## UI

- **Always use shadcn components.** Never hand-roll UI patterns that shadcn already provides — use `<Card>` / `<CardContent>` instead of `<div className="rounded-xl border bg-card ...">`, use `<Button>` instead of `<button className="rounded-md border ...">`, use `<Empty>` components instead of dashed-border divs, etc. Only use custom divs when shadcn has no equivalent.
- Icons: `@hugeicons/react` + `@hugeicons/core-free-icons` (no Lucide, no Phosphor).
- **No manual memoization** — React Compiler is enabled. Never use `useCallback`, `useMemo`, `React.memo`.
- **Single `useId()` per component** — call once, derive IDs: `` const id = useId(); const nameId = `name-${id}`; ``
- **Ternaries for conditionals** — `{x ? (...) : null}`, never `{x && (...)}`.
- **No inline event handlers** — define `on...` handlers in component scope or local render scope and reference them from JSX instead of inline arrow functions.
- `function` declarations for UI components, `const` for non-UI. `on` prefix for handlers (not `handle`).
- **Use `@app/components/ui/empty.tsx`** for all empty states in the app. Import and compose `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`, and `EmptyMedia` components.
- **Use `ScrollArea`** for contained scrollable UI panels (popovers, sheets, modals, notification lists, dropdowns with custom content) where native scrollbars look bad. Don't use it for main page content, sidebars, or native `<textarea>` elements — those should keep native scrolling for touch/trackpad behavior. Always give `ScrollArea` an explicit `h-` (not just `max-h-`).
- **All route skeletons live in `app/components/route-skeletons.tsx`** — this is the single centralised file for every `pendingComponent` skeleton. Never create skeleton components in other files. Every route with a `loader` must have a `pendingComponent` that matches its rendered layout. When a page's layout changes, update the corresponding skeleton in this file to stay in sync. The base `<Skeleton>` primitive is in `app/components/ui/skeleton.tsx`.

## Tooling + Commands

- Lint: Biome (`biome.json`). SQLC outputs excluded from lint/typecheck.
- `bun run setup.ts` — full setup | `bun run dev` — dev server | `bun run sqlgen` — generate SQLC
- `bun run test` — tests | `bun run typecheck` — types | `bun run check` — lint + types
- **After every change, run `bun run check` to verify linter and typechecking pass.**
- `bash setup-db.sh setup_pg` — create dev+test DBs | `bash setup-db.sh reset_pg` — reset both | `bash setup-db.sh rm_pg` — remove

## Git Commit Message Rules

- Do **not** append AI/tool attribution footers to commit messages.
- Keep commit messages clean and focused on the change summary only.
- Do not add generated-by/co-authored-by/signature boilerplate unless the user explicitly asks for a specific footer.

## Cloudflare Platform Rules

- **Always use the Cloudflare documentation MCP** (`cloudflare_search_cloudflare_documentation`) for any question about Workers, Workflows, Durable Objects, R2, AI, or bindings. Do not rely on pre-trained knowledge — the platform changes frequently.
- **Always use Zod schemas with `generateObject()` from the AI SDK** for structured outputs. `.strict()` on the Zod schema enforces `additionalProperties: false` — equivalent to OpenRouter's `strict: true`. Never prompt the model to "respond with JSON" when using `generateObject`.
- **Use the Response Healing plugin** on structured output calls via `openrouter.chat(model, { plugins: [{ id: "response-healing" }] })` — this auto-fixes malformed JSON from free-tier models.
- **Model selection is code-level**, not env-level. Change the typed arrays in `app/shared/openrouter.ts` to switch models. No `INTERVIEW_MODEL` env var.
- **Never guess about runtime behavior.** If unsure whether a binding works in local dev, whether a type signature is correct, or how an API responds, search the docs or test it. Do not assume.
- **Keep Workers runtime constraints in mind:** no filesystem access (except `/tmp` with `nodejs_compat`), no `process.env` (use bindings), serialized step returns only. All I/O must happen inside `step.do()`.

## Testing

- Two Postgres containers: dev (`rz_pg_dev:6311`) and test (`rz_pg_test:6312`). Tests never touch dev.
- `TEST_DATABASE_URL` in `.env`. Vitest 4 config in `vitest.config.ts` (`maxWorkers: 1`, `fileParallelism: false`, `isolate: false`).
- Global setup in `app/shared/__tests__/setup.ts` handles `afterEach(cleanTestData)` + `afterAll(closeTestDb)` — individual tests must NOT add their own cleanup hooks.
- Helpers in `app/shared/__tests__/test-utils.ts`: `getTestDb()`, `cleanTestData()`, `closeTestDb()`, `seedUser`, `seedCompany`, `seedJob`.
- File naming: `<feature>.test.ts`. Query tests in `queries/__tests__/`, business logic in `__tests__/`.
- Always update tests when changing features. Test categories: query-layer (real DB), schema/validation (pure), business logic (multi-step workflows).
