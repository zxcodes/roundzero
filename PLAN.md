# RoundZero — Remaining Work

> Tech stack, schema, auth, storage, and module layout are documented in `ARCHITECTURE.md`.

---

- [ ] Run 5–10 real applications through manual evaluation using the planned output format
- [ ] Show companies the output format and confirm they'd make decisions from it
- [ ] Adjust scoring dimensions, weighting, and presentation based on feedback
- [ ] Document final score schema and report structure in `AI-LAYER.md` (§ 15.5)
- [ ] Interview: final visual polish pass for terminal states and mobile layout edge cases
- [ ] Interview: time/question limits enforcement (configurable per interview type)
- [ ] Interview: progress tracking (stage transitions, question count)
- [ ] Full local smoke test: apply → pre-eval → invite → interview → complete → post-eval → batch release → company report view
- [ ] Golden-path test case fixture for regression
- [ ] Validate full conversational quality (manual UX review pass)
- [ ] Batch: applicant detail page shows `evaluated_held` / `queued_for_batch` states
- [ ] Batch: extract `BatchProgressCard` to shared component
- [ ] Batch: test timeout release path (no dedicated test yet)
- [ ] Batch: add `JobBatchesSkeleton` to route skeletons
- [ ] Voice: landing page voice assessment section (waveform + scores mockup)
- [ ] Voice: candidate-side UI polish for voice transitions and error recovery
- [ ] Set up Google Search Console and submit sitemap
- [ ] Monitor index coverage after sitemap submission
- [ ] Add breadcrumb structured data to job and company pages
- [ ] Landing page: add social proof section (logos, testimonials, or metrics once available)
- [ ] Landing page: add comparison section (traditional screening vs RoundZero side-by-side)
- [ ] Web accessibility: `prefers-reduced-motion` guard for animations
- [ ] Web accessibility: `aria-hidden="true"` on decorative icons (wrapper component)
- [ ] Web accessibility: skip link + `<main>` landmark
- [ ] Web accessibility: `aria-label` on icon-only buttons, filter selects, search inputs
- [ ] Web accessibility: `name` and `autocomplete` on form inputs
- [ ] Web accessibility: `tabIndex={-1}` on disabled pagination links
- [ ] Web accessibility: confirmation dialog for destructive status changes
- [ ] Web accessibility: proper `<a>`/`<Link>` for Terms/Privacy
- [ ] Web accessibility: visible `focus-visible` rings on upload buttons
- [ ] Web accessibility: replace `transition-all` with explicit property lists
- [ ] Web accessibility: replace hardcoded `"en-US"` locale with `Intl` defaults
- [ ] Web accessibility: replace `...` with `…` (ellipsis character)
- [ ] Web accessibility: add `text-wrap: balance` to headings
- [ ] Web accessibility: add `tabular-nums` to numeric columns
- [ ] Web accessibility: replace straight apostrophes with curly in `not-found.tsx`

---

## Key Product Decisions (Confirmed)

| # | Decision | Answer |
|---|---|---|----------|
| 1 | Quota exhausted behavior | Stop creating new interviews when `completedReports >= final_report_target`. Send `position_filled` to remaining pending candidates. They stay in pipeline (`pre_screening`), not auto-rejected. |
| 2 | Default `final_report_target` | `5` per job (max allowed: `15`) |
| 3 | Low-match outcome | Hold in `pre_screening`. Company can manually reject. No system auto-reject. |
| 4 | Unevaluated visibility | Yes — separate "Pending" tab, read-only. Companies see all applicants; only evaluated ones get AI reports. |
| 5 | Pre-evaluation timing | Async. Nothing in the AI flow is synchronous. All steps run as background jobs, queues, or workflows. |
| 6 | Field name for limit | `final_report_target` |

---

## One-Line Definition

> RoundZero deeply evaluates the right candidates, not every candidate.
