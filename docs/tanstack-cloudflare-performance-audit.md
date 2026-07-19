# TanStack Start and Cloudflare Performance Audit

**Audit date:** July 18, 2026  
**Scope:** TanStack Start routing and data loading, Cloudflare Workers and Workflows, caching, authenticated round trips, SSR, and static frontend performance.

## Executive summary

The app generally follows TanStack Start and Cloudflare architecture correctly. Authentication is enforced in server-function middleware, Hyperdrive/R2/Workflows use bindings, route splitting is active, and expensive `beforeLoad` work is query-cached.

However, the audit found:

- One privacy/correctness blocker
- Two high-risk Workflow/runtime issues
- Several avoidable authenticated round-trip hotspots
- A Router cache setting that causes unnecessary revalidation
- Meaningful bundle, SSR, and edge-cache opportunities

The audit covered 46 route files and 24 `beforeLoad` hooks and used current TanStack Intent and Cloudflare Workers guidance. This was a static audit; no measured Core Web Vitals are claimed.

## Must fix

### 1. Blocker: account erasure can orphan private R2 objects

`deleteR2Objects()` in `app/features/accounts/server/cleanup.ts:29-38` catches deletion failures, but account erasure then continues and removes the database fields containing those R2 keys in `app/features/accounts/server/cleanup.ts:84-102`.

A transient R2 failure can therefore leave a resume or voice recording stored indefinitely, with no remaining reference allowing cleanup to retry.

The enclosing account-cleanup Workflow also catches errors inside `step.do()` in `app/workflows/account-cleanup/workflow.ts:31-52`, causing Cloudflare to consider the step successful and bypass its configured retries.

**Recommended fix:**

- Let any R2 deletion failure reject before database scrubbing.
- Catch exhausted failures outside `step.do()` so Workflow retries still run.
- Add a failure-path test proving keys remain available after a failed deletion.

### 2. High: a Hyperdrive client is reused across durable Workflow steps

`PostEvaluationWorkflow` creates `db` once at the start of `run()` in `app/workflows/post-evaluation/workflow.ts:26-38`, then captures it across many separate `step.do()` callbacks, including report persistence and notification steps around lines 184-220.

Cloudflare Workflows can hibernate, restart, and resume later or elsewhere. Non-durable Postgres connection state must not cross step boundaries.

**Recommended fix:** create `getDb()` inside every database-bearing `step.do()` callback. Update step factories so they do not capture a client created outside the step.

### 3. High: loader fan-out repeats Worker, authentication, and database work

Several screens turn one navigation into multiple protected server-function calls:

- Applicant review makes three calls in `app/routes/_authenticated/dashboard/applicants/$applicationId.tsx:59-76`.
- Interview detail makes two calls that independently authorize and load the same interview in `app/routes/_authenticated/interview/$interviewId.tsx:15-30`.
- Candidate application detail makes two authenticated calls in `app/routes/_authenticated/dashboard/application/$applicationId.tsx:48-57`.
- Job detail first loads the job, then makes one or two additional protected calls in `app/routes/_authenticated/dashboard/jobs/$jobId.tsx:14-34`.
- `/interview` loads the same list in both the parent loader (`app/routes/_authenticated/interview.tsx:17-20`) and index loader (`app/routes/_authenticated/interview/index.tsx:17-30`).

Parallel `Promise.all()` reduces latency between calls, but each server function is still a separate RPC during client navigation and repeats `authMiddleware` or `companyMiddleware` work from `app/shared/middleware.ts:15-55`.

During initial SSR these may not all be browser-to-Worker hops, but they still repeat dispatch, authentication, authorization, and queries.

**Recommended fix:** use one page-specific server function per loader phase. Authenticate and authorize once, then parallelize related database queries inside that function.

Prioritize:

1. Applicant review
2. Interview detail
3. Authenticated job detail
4. Candidate application detail
5. Duplicate interview index load

## Caching and data loading

### 4. Medium-high: ordinary Router loader data is immediately stale

The React Query client has a 60-second `staleTime`, and intent preloading has a 30-second `defaultPreloadStaleTime`, in `app/router.tsx:23-47`.

However, the Router itself has no `defaultStaleTime`. TanStack Router therefore uses its default of `0`, meaning ordinary loader results are considered stale immediately and can reload on re-entry. The React Query setting only applies to operations explicitly performed through `queryClient`, such as current user and company bootstrap.

**Recommended fix:** set a deliberate Router `defaultStaleTime`, likely 30-60 seconds, or configure it on read-heavy routes. Existing mutation-driven `router.invalidate()` calls can maintain correctness.

### 5. Medium: root authentication blocks every route's SSR path

The root route always awaits the current-user query in `app/routes/__root.tsx:106-121`.

The impact needs careful qualification:

- Anonymous users still wait for session resolution.
- Anonymous users do not query Postgres; `getCurrentUser()` returns early without a user ID in `app/features/auth/server/functions.ts:284-300`.
- Signed-in users incur a user-table query.
- Every SSR request gets a new QueryClient, so the 30-second freshness does not cache across visitors or SSR requests.

The larger consequence is that public HTML becomes identity-dependent, making shared edge caching unsafe. Root output uses the user for public-route theme behavior in `app/routes/__root.tsx:140-180`, and public navigation also varies by authentication state.

**Recommended direction:** use production TTFB data before redesigning this boundary. Longer-term, make anonymous public SSR user-invariant and move full user resolution under the authenticated route tree. A cheap session-presence path can handle public redirects if needed.

### 6. Medium: sitemap performs uncached database scans

Every request to `/sitemap.xml` queries all open jobs and companies and rebuilds the XML in `app/server.ts:63-91`. The response has no `Cache-Control`, ETag, or Cache API usage.

**Recommended fix:**

- Cache the generated response through `caches.default` with a bounded TTL.
- Add `Cache-Control` and an ETag or `Last-Modified` value.
- Cache `robots.txt` too, although its generation is inexpensive.

Merely adding browser/CDN headers may not avoid Worker execution and database work; Cache API use is the stronger fix.

## Workflow reliability

### 7. Medium: evaluation retry configuration is ineffective

`EvalRetryWorkflow` catches failures inside its retryable callback in `app/workflows/eval-retry/workflow.ts:41-67`. Returning `{ status: "error" }` fulfills the step, so the configured Cloudflare retry never runs.

**Recommended fix:** let the `step.do()` callback throw. Catch around the `await step.do(...)` call after retries are exhausted, record the item failure, and continue the sweep.

### 8. Medium: extracted resumes may exceed Workflow step-result limits

The pre-evaluation pipeline accepts compressed documents up to 5 MiB and can return extracted text as a durable step result without a sufficiently strict output cap. Highly compressible DOCX/PDF content can exceed Cloudflare's non-stream step-output limit.

**Recommended fix:** enforce a UTF-8 byte or character limit before returning extracted text from the step. Align it with the useful model context budget and explicitly record truncation.

## Client payload and rendering

### 9. Medium: interview content has blank SSR and an unnecessarily coupled voice bundle

The leaf interview page wraps its content in `ClientOnly` without a fallback in `app/routes/_authenticated/interview/$interviewId/index.tsx:55-70`. The parent sidebar shell can SSR, but the main interview content remains empty until hydration.

The route also statically imports both chat and voice assessment components around lines 15-23. Voice dependencies include ElevenLabs and realtime APIs even though voice is only relevant later.

The existing build showed an approximately 568-579 KB raw interview chunk, although that artifact may not exactly match the latest source.

**Recommended fix:**

- Give `ClientOnly` a meaningful skeleton fallback.
- SSR stable header/status content where possible.
- Lazy-load the voice panel when voice becomes available or the tab is selected.
- Move shared display helpers out of the voice component so chat does not pull the voice dependency graph.

The voice panel is not initially mounted and does not immediately start microphone access, so this is primarily a transfer and hydration concern, not an eager execution bug.

### 10. Medium-low: Google OAuth and auth providers are global

The root mounts `GoogleOAuthProvider` and `AuthProvider` around every route in `app/routes/__root.tsx:127-137`, including marketing, jobs, companies, legal, and contact pages.

**Recommended fix:** move Google OAuth to login/invite boundaries and authenticated state providers under `_authenticated`, provided public navigation does not depend on them.

### 11. Medium-low: marketing images lack responsive sources

- `public/marketing/report.png`: approximately 161 KB, 2940x1676
- `public/marketing/report-product.png`: approximately 411 KB, 2342x1568

The images reserve layout space and the hero is correctly eager/high-priority, but small screens receive the same large source.

**Recommended fix:** provide responsive AVIF/WebP variants using `<picture>` or `srcSet`/`sizes`. Keep the hero eager and preserve intrinsic dimensions.

### 12. Low: font imports include all default subsets

`app/styles.css:1-13` imports the complete Geist and Geist Mono packages, generating Latin, Latin Extended, Cyrillic, Vietnamese, and other subset assets.

Unicode ranges prevent every user from downloading everything, so this is not a major transfer defect. Still, the output carries unnecessary declarations and files for an English app.

**Recommended fix:** import only required Latin variable font entry points. Only preload the primary sans font if a production trace shows font discovery delaying LCP.

## Cloudflare configuration and operations

### 13. Medium-low: unused raw database credentials are injected into the Worker

Runtime database access correctly uses the Hyperdrive binding in `app/shared/db.ts:1-8`, but deployment also injects `DATABASE_URL` as a Worker runtime secret even though migrations already receive it separately.

**Recommended fix:** remove `DATABASE_URL` from the Worker runtime environment schema and `.env.ci` heredocs. Keep it only for migration jobs. This reduces credential exposure and enforces Hyperdrive-only runtime access.

### 14. Low: compatibility date should be advanced periodically

`wrangler.jsonc:1-5` is pinned to `2026-04-23`, roughly three months behind the audit date.

**Recommended fix:** update it in staging, run critical Worker and Workflow paths, then promote. Establish a periodic compatibility-date update cadence.

### 15. Low: Sentry traces every production request

The Sentry configuration uses `tracesSampleRate: 1.0`, while all non-development requests are wrapped by Sentry.

**Recommended fix:** lower production trace sampling unless full tracing is intentionally required. Reconsider default PII collection against the application's privacy policy.

### 16. Low: Postgres.js likely performs avoidable type discovery

`getDb()` in `app/shared/db.ts:4-8` does not set `fetch_types: false`. Postgres.js can issue a type-discovery query when opening connections. No PostgreSQL array columns were found that obviously require it.

**Recommended fix:** confirm no raw query relies on PostgreSQL array serialization, then set `fetch_types: false`.

## What the app does well

- Only two `beforeLoad` hooks fetch data, and both use `queryClient.fetchQuery()` with explicit freshness.
- UUID checks and role redirects stay cheap in `beforeLoad`.
- Protected server functions use authentication and authorization middleware rather than relying only on route guards.
- TanStack route and server-function code splitting is active.
- Intent preloading and pending thresholds are configured sensibly.
- Deferred dashboard data uses `Await` and local fallbacks correctly.
- Mutations generally use safe navigation/invalidation ordering.
- Company bootstrap consolidates related reads well.
- Hyperdrive, R2, email, and Workflow bindings are environment-specific.
- R2 asset responses stream object bodies and set immutable caching plus ETags.
- Long-running evaluation work is correctly moved into Workflows.
- Most Workflows create database clients within individual steps.
- Observability, traces, source maps, and `nodejs_compat` are enabled.
- No global request-scoped mutable state, `passThroughOnException`, Cloudflare REST calls in place of bindings, or obvious floating server-side fetches were found.

## Recommended remediation order

1. Fix account-erasure failure handling.
2. Make post-evaluation database usage step-local.
3. Restore actual retries in cleanup/evaluation sweeps and cap resume step output.
4. Collapse the hottest loader phases into one server function each.
5. Set intentional Router loader freshness.
6. Cache sitemap generation.
7. Split the interview voice dependency graph and add an SSR fallback.
8. Use production traces before redesigning root authentication/public SSR.
9. Address responsive images, font subsets, secrets, Sentry sampling, and compatibility-date maintenance.

## Verification note

This was a read-only static audit. No runtime performance trace or measured Core Web Vitals were available, and no application source files were changed as part of the audit.
