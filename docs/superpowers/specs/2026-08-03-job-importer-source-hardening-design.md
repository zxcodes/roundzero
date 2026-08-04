# Job Importer Source Hardening Design

## Objective

Make every advertised URL importer reliable against current public ATS formats, including large company boards, while keeping external responses bounded and preserving actionable errors.

## Source strategy

Source detection returns both the platform and a fetch plan. A plan identifies whether the input is an individual posting or a board, its expected response format, and any safe fallback requests.

For individual posting URLs, use the smallest public representation available:

- Greenhouse: public single-job API, then the individual HTML page as Schema.org fallback.
- Lever: public single-posting API, then the individual HTML page as Schema.org fallback.
- Ashby: individual HTML page and its Schema.org `JobPosting`; use the board API only for board URLs.
- Recruitee: public single-offer API, then the individual HTML page as Schema.org fallback.
- SmartRecruiters: company posting index followed by bounded detail hydration; support both current nested `jobAd.sections` and the legacy flat `jobAd` shape.
- Generic: one Schema.org `JobPosting` from the supplied individual page.

Board imports continue to use official public feeds and stop normalization after 50 valid jobs. The fetcher retains strict HTTPS, redirect, timeout, content-type, and private-network protections. Each fetch plan has an explicit byte budget: small for individual pages and details, larger but still bounded for known ATS board feeds. Generic hosts never receive the larger trusted-platform budget.

## Parsing and fallback behavior

Adapters accept the provider response variants needed by their fetch plans: collection and single-record Greenhouse, Lever, and Recruitee payloads; Ashby board JSON and individual Schema.org HTML; current and legacy SmartRecruiters job-ad sections.

Fallbacks run only for compatible failures such as an unavailable platform endpoint or an unsupported response shape. Security failures, forbidden redirects, timeouts, and oversized generic responses are not bypassed. Failed records inside a valid collection are skipped while other valid records remain importable. If no valid records remain, return one source-specific actionable error.

The importer does not use browser automation or arbitrary DOM scraping. Schema.org JSON-LD is the stable HTML fallback.

## Data flow

1. Detect the platform and extract board, company, slug, or posting identifiers.
2. Build an ordered fetch plan with response format and byte limit.
3. Fetch each attempt through the existing safe fetcher.
4. Parse and normalize with the matching provider adapter.
5. Stop at the first successful attempt and persist at most 50 preview items.
6. Preserve the existing duplicate checks, review workflow, and draft-only import behavior.

## Error handling

- Distinguish an invalid URL, missing board, unreachable source, oversized source, unsupported page, and zero importable jobs.
- Preserve SSRF-safe redirect validation for every attempt.
- Do not expose upstream bodies or internal errors.
- Do not silently label a partial provider failure as a complete import; add a batch warning when malformed records were skipped if the current preview model can represent it, otherwise retain per-item warnings for parsed records and log the skipped count.

## Testing

- Unit fixtures for single and collection payloads from every provider.
- Current and legacy SmartRecruiters description shapes.
- Fetch-plan detection for board and individual URLs, including EU hosts and query strings.
- Byte-budget, redirects, timeouts, content types, and fallback eligibility.
- Malformed-record isolation and the 50-job ceiling.
- Live smoke tests against active public URLs for Greenhouse, Lever, Ashby, Recruitee, SmartRecruiters, and a generic Schema.org page.
- Run the importer feature tests, full `bun run check`, and the complete test suite after implementation.

## Non-goals

Authenticated ATS integrations, arbitrary site crawling, browser scraping, candidate migration, and continuous synchronization remain out of scope.
