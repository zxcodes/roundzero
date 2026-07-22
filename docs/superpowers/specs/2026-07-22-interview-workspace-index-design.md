# Interview Workspace Index Design

## Problem

Navigating to `/interview` from the main application sidebar can trap the browser in repeated routing work and eventually crash the tab. The parent interview workspace loader currently fetches the candidate's interviews and throws a redirect to a preferred interview when the target location is the workspace index.

The interview parent route remains matched after that redirect. During client-side navigation, TanStack Router can reuse the parent match and its cached loader result while resolving the detail URL. Moving the redirect into this persistent parent loader therefore makes the redirect part of a route that must also load the redirect target. Intent preloading and the 30-second route cache make the failure timing-dependent. A direct document request uses a fresh router, which explains why it does not consistently reproduce.

The automatic selection is also unnecessary. Candidates should explicitly choose the interview they want to view.

## Approved Behavior

- `/interview` and `/interview/` render the interview workspace without selecting an interview.
- When at least one interview exists, the content panel tells the candidate to select an interview from the workspace sidebar.
- When no interviews exist, the content panel retains the existing “No interview sessions yet” state and link to applications.
- Clicking an enabled interview in the workspace sidebar navigates directly to its detail route.
- Expired interview behavior remains unchanged and outside this fix.
- No last-selection state, automatic selection, or index redirect is introduced.

## Implementation

The parent interview route will only enforce candidate access and load the interview list for the workspace sidebar. It will no longer inspect the target pathname or throw an index redirect.

The index component will read the parent loader's interview list and choose between the two static empty states. This reuses the single parent server-function call and adds no worker round trip. The preferred-interview helper and its tests will be removed because they have no remaining consumer.

## Error Handling and Performance

Existing loader and global error-boundary behavior remains unchanged for failures while loading interviews. Removing the redirect from the parent loader eliminates the redirect/cache interaction without adding data fetching to `beforeLoad` or duplicating a server-function call in the index loader.

## Verification

- Remove the preferred-interview unit tests with the deleted helper. The project has no React component-testing dependency or existing route-component test pattern, so this fix will not introduce a new test harness.
- Run `bun run check` after the change.
- Run `bun run test`.
- Manually verify that both main-sidebar navigation and direct navigation to `/interview/` show an unselected workspace, and that selecting an enabled sidebar interview opens its detail page.

## Scope

This change does not alter interview ordering, statuses, expiry rules, interview detail loading, or sidebar grouping. It only removes automatic selection and makes the unselected workspace state explicit.
