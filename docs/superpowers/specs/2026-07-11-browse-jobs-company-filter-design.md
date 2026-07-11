# Browse Jobs Company Filter and Applied-Job Exclusion

## Goal

Improve job discovery by letting visitors filter open jobs by company and by keeping jobs a signed-in candidate has already applied to out of the candidate browse list.

## Scope

- Add a company dropdown to the public `/jobs` page and the candidate view of `/dashboard/jobs`.
- Store the selected company in each route's validated URL search parameters and reset pagination when it changes.
- Exclude jobs with an existing application by the current candidate from the authenticated candidate browse results and result count.
- Keep applied jobs visible on the public job board, which has no authenticated candidate context.
- Add a subtle candidate-only message below the page introduction: “Jobs you’ve already applied to are hidden.”

## Data Design

The public and candidate loaders will continue to make one server-function call per loader phase. Each response will include:

- the filtered, paginated jobs;
- the filtered total and total-page count; and
- an alphabetized list of companies that currently own at least one visible open job, for the company dropdown.

The public server function remains unauthenticated. A candidate-specific server function will use `authMiddleware` and pass `context.userId` to candidate-only SQL queries. Those queries will use `NOT EXISTS` against `applications` for the current candidate. This keeps the authentication boundary explicit instead of accepting a client-provided candidate ID.

Company filtering will use the company UUID selected from server-provided options. The result and count queries will apply the same company predicate so pagination remains correct. Company options will represent companies with open, non-archived, non-expired jobs whose owner is active; they will not shrink in response to the other active filters.

## UI Behavior

The company select will follow the existing horizontal filter-row pattern and use the installed shadcn `Select`. Its default option is “All companies.” Selecting a company updates the URL and resets `page` to 1. The company parameter participates in `hasFilters` and the deferred result reset key.

On the candidate page, the small applied-job message is persistent rather than conditional on whether exclusions occurred. This clearly explains why a previously viewed job may no longer appear without adding another query or response field solely to count exclusions.

Empty states retain their existing filtered and unfiltered wording. Because applied jobs are intentionally not browse results, a candidate with no remaining jobs sees the standard “No open jobs” state alongside the persistent exclusion message.

## Error and Security Behavior

- Invalid or stale company IDs are harmless: they produce no matching jobs.
- The candidate ID comes only from `authMiddleware`; clients cannot request exclusions for another user.
- Existing public behavior remains unchanged except for the new company filter and company options in the response.

## Verification

- Query tests verify filtering by one company excludes another company's jobs from both items and count.
- Query tests verify a candidate's own applied job is excluded while an application by another candidate does not hide the job.
- Run SQL generation after changing query definitions.
- Run `bun run check` after implementation, plus the focused jobs query tests.
