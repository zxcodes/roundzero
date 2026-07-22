# Candidate Match List and Seed Cleanup Design

## Goal

Make personalized job matches feel like the existing authenticated job browser, route candidates through the private job detail, and ensure a fresh development seed contains realistic user-facing job content without test-fixture naming.

## Match list

The **For you** tab will use the same single-column, divided-list presentation as **All jobs**. `JobListRow` will gain optional extension points for match content and actions so the shared job identity, metadata, spacing, hover state, and responsive behavior remain consistent.

Matched rows will show:

- job title and company;
- existing location, salary, employment, experience, and workplace metadata;
- a match-band badge;
- at most two grounded match reasons, or the existing limited-evidence message when fewer than two reasons are available;
- the existing consideration text when present;
- **Not relevant** and **View job** actions aligned at the bottom-right of the row without a border or separate action section.

Matched rows will not show job descriptions. Bounded reasons replace them, preventing content-length-driven card geometry while preserving the explanation for each recommendation.

The main row link and **View job** action will navigate to `/dashboard/jobs/$jobId`. Viewing will still be recorded. Buttons will remain outside the link target so the markup does not nest interactive controls.

Existing public uses of `JobListRow` will retain their current behavior and routes.

## Seed content

The existing seeded job scenarios will keep their deterministic IDs, statuses, targets, and applicant plans. Only user-facing content will change:

- remove `[Quota]` prefixes and scenario labels from titles;
- replace descriptions beginning with `Quota test:` with realistic job summaries;
- avoid names such as `Matching Fixture`, `Capacity Full`, `Increase Target`, `Reject and Backfill`, `Active Batch`, `Target Reached`, and `Empty Draft` in visible content.

Scenario semantics remain encoded in seed data rather than exposed in the UI. The temporary `Matching Fixture` records created during local integration testing are not part of the seed and will disappear when the database is reset.

The seed may create applications and reports only for its synthetic candidate pool so company dashboards have useful data. It must never create applications, notifications, candidate profiles, or resume assignments for a real development candidate account. A developer's candidate account remains untouched and can browse every seeded open role.

Seeded open jobs will also receive deterministic, ready matching profiles derived from their job-specific qualifications. These profiles use the same profile version and source-hash contract as runtime extraction, so local candidate refreshes work immediately without seeding candidate matches. Editing a seeded job later still invalidates the profile and requests normal extraction.

## Reconciliation

Reconciliation runs hourly in every deployed environment. When a pass discovers missing, failed, or stale job profiles, it starts those extraction workflows first. If the environment has no ready open-job profiles yet, it leaves candidate refreshes for the next pass. This ordering prevents candidate workflows from racing the initial asynchronous job backfill and publishing an empty feed, without allowing one permanently failing job to block all future refreshes. Draft, closed, archived, and expired jobs remain excluded.

## Error and state handling

Existing feed loading, empty, stale-resume, refresh-failure, dismissal, and refresh states remain unchanged. A failed dismissal keeps the row visible and shows the existing error toast. Navigation must not wait for the viewed mutation to complete.

## Verification

- Add focused coverage for the shared row extensions and private match destination where the existing test setup supports it.
- Keep route skeleton geometry aligned with the single-column list.
- Run `bun run check`, `bun run test`, and `bun run build`.
- Reset and rerun the seed to confirm realistic visible job titles and descriptions.
