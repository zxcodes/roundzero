# RoundZero demo-native landing page

## Objective

Rebuild the public landing page as a production-ready B2B SaaS site for startups and small teams that want to hire without résumé triage or scheduled first-round screens. The page must feel like the existing RoundZero product demo, not like a generic SaaS template.

The page has one job: make a hiring team understand that RoundZero pre-screens every applicant, interviews selected candidates, and hands the team decision-ready reports before a human spends time on those candidates.

## Visual direction

The product demo is the source of truth.

- Palette: white `#FFFFFF`, ink `#2E3038`, soft surface `#F7F7F8`, muted text `#71717A`, border `#E4E4E7`, success `#2F7A4D`.
- Typography: Geist for display and body, Geist Mono only for product metadata and small utility labels.
- Shape: restrained product-matched radii. Large rounding is reserved for the browser frame, not every section.
- Color: no purple, rainbow gradients, decorative neon, or invented brand colors.
- Copy: short declarative sentences. No em dashes, exaggerated claims, or generic AI language.
- Motion: one slow neutral mesh field in the closing section. No floating cards or scattered scroll effects.

The signature is the contrast between a restrained editorial layout and the real RoundZero application surface.

## Page structure

### Header

Use the existing rebuilt header with the RoundZero mark. Desktop navigation contains Product, Jobs, Pricing, and For candidates. Actions are Log in and Post a job. Mobile uses the existing Sheet pattern.

### Hero

Use the left-aligned thesis `Review candidates, not resumes.` Explain in one sentence that every applicant is pre-screened and selected candidates receive evidence-backed reports before the hiring team schedules a real interview.

Primary action: Post a job. A secondary text link may move the visitor to the product flow.

The visual is the original full application screenshot with its sidebar, navigation, and report surface visible. Preserve the screenshot's natural aspect ratio on desktop. On mobile, use the original 840-pixel crop from the pre-redesign landing page so the sidebar and report remain legible. Fade the bottom of the screenshot into white with the original mask gradient. Do not use the live shader in the hero.

The launch video is not part of the landing page. Do not add a replacement section. The product flow follows the hero directly.

### How it works

Present the real sequence as three editorial rows:

1. Post the role and define what good looks like.
2. Selected candidates complete an adaptive first interview.
3. The team receives ranked, evidence-backed reports.

The numbering is functional because the content is a real sequence. Use product crops and interface details rather than decorative cards.

### Report deep dive

Use the sidebar-free report image from `roundzero-demo/public/roundzero-report.png`. Render it at its natural aspect ratio with `width: 100%` and `height: auto`. Do not use a fixed-height crop, `object-fit: cover`, or translated positioning. The candidate name, controls, score, verdict, strengths, concerns, and evidence must not be clipped.

Pair it with direct copy explaining that every score has a traceable reason and that hiring teams can shortlist or reject from the report.

### Candidate experience

Use a quiet split layout explaining that applicants interview on their own time and are evaluated on what they say, not résumé formatting or keyword density. Keep this section text-led unless a genuine candidate-side product asset is available.

### Pricing, FAQ, and closing

Retain real plan data from the billing configuration. Simplify the presentation into a restrained comparison with one clearly recommended plan. Remove decorative cost-comparison claims that cannot be substantiated on the page.

Keep the FAQ concise. End on the neutral mesh with one direct question and one Post a job action.

## Implementation boundaries

- Keep the existing TanStack route, authentication redirect, SEO helpers, billing configuration, and public navigation destinations.
- Update `app/routes/index.tsx`, `app/components/public-layout.tsx`, `app/features/marketing/components/pricing-section.tsx`, and marketing-only styles in `app/styles.css`.
- Add marketing assets under `public/marketing/`.
- Use shadcn `Button`, `Sheet`, and `Accordion` components and Hugeicons only.
- Avoid new abstractions unless a visual component is genuinely reused.
- Do not add server calls or loader work.

## Performance and accessibility

- Load the mesh only on the client and provide a static neutral fallback.
- Reduce shader pixel density and stop or replace motion for `prefers-reduced-motion`.
- Preserve keyboard focus, the skip link, semantic heading order, useful image alt text, and sufficient contrast.
- Keep mobile layouts readable without horizontal overflow. The hero and report images must preserve the meaningful edges of their product surfaces.

## Verification

- Run `bun run check`.
- Review the page at desktop and mobile widths on the existing port 3000 server.
- Confirm the header, anchor navigation, mobile Sheet, pricing links, FAQ, and calls to action work.
- Capture screenshots and remove any element that reads as ornamental, duplicated, or template-like.
