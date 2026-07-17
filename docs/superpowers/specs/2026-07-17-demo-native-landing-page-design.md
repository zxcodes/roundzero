# RoundZero demo-native landing page

## Objective

Rebuild the public landing page as a production-ready B2B SaaS site for startups and small teams that want to hire without résumé triage or scheduled first-round screens. The page must feel like the existing RoundZero product demo, not like a generic SaaS template.

The page has one job: make a hiring team understand that RoundZero conducts the first interview, evaluates every applicant, and hands the team a decision-ready report before a human spends time on the candidate.

## Visual direction

The product demo is the source of truth.

- Palette: white `#FFFFFF`, ink `#2E3038`, soft surface `#F7F7F8`, muted text `#71717A`, border `#E4E4E7`, success `#2F7A4D`.
- Typography: Geist for display and body, Geist Mono only for product metadata and small utility labels.
- Shape: restrained product-matched radii. Large rounding is reserved for the browser frame, not every section.
- Color: no purple, rainbow gradients, decorative neon, or invented brand colors.
- Copy: short declarative sentences. No em dashes, exaggerated claims, or generic AI language.
- Motion: one slow neutral mesh field in the hero and closing section. Product movement should feel like the camera work in the demo. No floating cards or scattered scroll effects.

The signature is a live neutral mesh field behind a tightly framed product surface. It should feel like the website and the product film are the same system.

## Page structure

### Header

Rebuild the header so it belongs to the hero. It is transparent over the mesh at the top, gains a quiet translucent surface when sticky, and uses the existing RoundZero mark. Desktop navigation contains Product, Jobs, Pricing, and For candidates. Actions are Log in and Post a job. Mobile uses the existing Sheet pattern.

### Hero

Use a concise thesis: RoundZero replaces the first interview. Explain in one sentence that every applicant is interviewed and returned as an evidence-backed recommendation before the hiring team spends time on round one.

Primary action: Post a job. Secondary action: Watch the demo.

The visual is one browser-like product surface, not a collage. It uses the sidebar-free report asset from the demo project and keeps the recommendation, verdict, strengths, concerns, and interview evidence legible. The neutral mesh sits behind the hero and remains subtle enough to preserve contrast.

### Product demo

Place the full product demo immediately after the hero in a dedicated player. Do not autoplay the 29-second file. Show a high-quality poster and a clear play action. The video is the primary proof of how the system works.

### How it works

Present the real sequence as three editorial rows:

1. Post the role and define what good looks like.
2. Every applicant completes an adaptive first interview.
3. The team receives ranked, evidence-backed reports.

The numbering is functional because the content is a real sequence. Use product crops and interface details rather than decorative cards.

### Report deep dive

Use the sidebar-free report image from `roundzero-demo/public/roundzero-report.png`. Crop and position it so the recommendation, score, verdict, strengths, concerns, and evidence are the focus. Do not display irrelevant navigation or an unreadably scaled full application shell.

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
- Do not autoplay the full demo. Use `preload="metadata"` and an explicit play action.
- Preserve keyboard focus, the skip link, semantic heading order, useful image alt text, and sufficient contrast.
- Keep mobile layouts readable without horizontal overflow. Product frames may crop intentionally rather than shrink into illegibility.

## Verification

- Run `bun run check`.
- Review the page at desktop and mobile widths on the existing port 3000 server.
- Confirm the header, anchor navigation, mobile Sheet, demo playback, pricing links, FAQ, and calls to action work.
- Capture screenshots and remove any element that reads as ornamental, duplicated, or template-like.
