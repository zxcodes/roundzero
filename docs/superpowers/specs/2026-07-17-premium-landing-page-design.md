# Premium Landing Page Redesign

**Date:** 2026-07-17  
**Status:** Approved design

## Objective

Redesign the public RoundZero landing page so it feels like a premium B2B SaaS product for startups and lean teams that want to hire without traditional recruiting overhead. The page should retain RoundZero's direct, anti-bureaucracy voice while presenting the product with the visual depth and polish associated with high-end Framer sites.

The page's single job is to persuade a hiring team to post a job. It should make the core transaction immediately understandable: candidates apply, RoundZero evaluates them, and the team receives ranked, evidence-backed reports before scheduling a human interview.

## Audience and Positioning

The primary audience is founders, hiring managers, and small recruiting teams that want good hiring decisions without résumé triage, first-round scheduling, recruiter overhead, or a complicated ATS rollout.

The voice is direct but polished. RoundZero rejects the machinery of conventional hiring without sounding angry, gimmicky, or careless. Copy should prefer concrete outcomes over generic AI claims.

Core positioning:

> Hiring without the hiring machinery.

Supporting idea:

> Evaluate every applicant before spending human time.

## Creative Direction

The chosen direction is **product theatre**: a dimensional, light-and-dark product showcase that uses real RoundZero UI as the primary visual material. The interface should feel tangible, valuable, and active rather than placed on the page as a flat screenshot.

The signature visual is the **evidence trail**. An interview excerpt visually feeds into a competency score, a strength or concern, and the final recommendation. This represents RoundZero's explainability and distinguishes the page from generic AI-product marketing.

The page should avoid:

- an entirely dark neon-AI aesthetic;
- decorative gradients without a content purpose;
- repeated equal-width text grids;
- invented customer logos, testimonials, or performance metrics;
- dense technical workflow logs intended primarily for engineers;
- excessive glass effects, floating pills, or unrelated micro-animation.

## Visual System

### Color

- **Pearl `#F6F7F9`** — primary light background.
- **Ink `#11131A`** — primary text and dark-section background.
- **Iris `#625BF6`** — signature brand accent, illumination, focus, and selected states.
- **Signal green `#2E9B72`** — positive recommendations and success only.
- **Silver `#DDE1E8`** — borders, dividers, and secondary surfaces.

Existing semantic application colors continue to govern embedded product UI. Iris must not replace warning, rejection, or success semantics.

### Typography

Use **Bricolage Grotesque Variable** for marketing headlines and retain Geist for body copy and product UI. Load Bricolage Grotesque locally through Fontsource rather than a remote stylesheet.

- Hero headline: approximately 64–80 px on wide screens, responsive below that.
- Section headlines: approximately 40–56 px.
- Body copy: 16–18 px with restrained line lengths.
- Mono type: product data, workflow labels, and evidence metadata only.

Typography should carry more of the brand than ornamental graphics. Headlines use tight tracking and deliberate line breaks; paragraphs remain plain and highly legible.

### Surfaces and Depth

Light sections use pearl rather than pure white. Dark sections use ink with low-contrast elevated panels. Hero product frames use subtle perspective, soft directional shadows, and restrained iris illumination. Borders remain crisp enough to preserve the product's decision-system character.

Depth should be concentrated in the hero and evidence trail. Other sections remain calmer so the page does not become a collection of competing effects.

## Page Architecture

### 1. Header

Retain the current public navigation and sticky behavior. Give the header slightly more breathing room and a refined translucent surface that works across both the light hero and later sections. Keep `Post a job` as the dominant action.

### 2. Hero

The hero must explain the entire product before the user scrolls.

Content:

- Headline: `Hiring without the hiring machinery.`
- Supporting copy centered on evaluating applicants before spending human time.
- Primary CTA: `Post a job`.
- Secondary CTA: `See how it works`, anchored to the product story.

Visual composition:

- Place the copy in a dominant left column on wide screens.
- Present `/public/marketing/report.png` in a dimensional product frame on the right.
- Create two overlapping HTML detail cards that faithfully reproduce the existing report content: the `9.2 Strong shortlist` result and one transcript-backed evidence item.
- Use a restrained iris radial light behind the product frame.
- Do not shrink the entire report until its contents are illegible.

Mobile stacks the headline, CTAs, report frame, and detail cards without perspective distortion or horizontal overflow.

### 3. Anti-BS Positioning Strip

Follow the hero with an ink band containing:

`No résumé triage · No scheduling round one · No keyword roulette · No recruiter markup`

On screens at least 768 px wide, the line moves as a slow seamless marquee. On smaller or reduced-motion devices it remains static. The strip is a positioning statement, not a decorative ticker.

### 4. Product Story

Replace the current separate problem, fix, and four-column workflow sections with three large alternating scenes:

1. **Post the role** — show a focused job-summary card with role requirements and evaluation criteria.
2. **Zero runs the first round** — show the adaptive interview and follow-up behavior.
3. **Review the evidence** — show ranked reports and candidate comparison.

Each scene pairs a dominant product visual with short outcome-led copy. Layout alternates by section on desktop and becomes a consistent text-then-visual sequence on mobile.

### 5. Evidence Trail

This is the signature dark section and the primary explanation of how RoundZero reaches a decision.

Show one realistic chain:

1. a candidate makes a specific claim in the interview;
2. Zero asks a role-relevant follow-up;
3. the answer produces a competency observation;
4. that observation appears as evidence within the report;
5. the evidence contributes to the final recommendation.

The desktop version reveals the chain progressively as the user scrolls. The page must remain fully understandable without animation. Mobile presents the same chain as stacked connected cards.

This section replaces the current pipeline-log presentation. It explains the durable evaluation process from the buyer's perspective instead of exposing implementation details.

### 6. Report Showcase

Use the existing high-resolution report image as the core proof asset.

- Show the full report once at a readable scale.
- Reuse it through CSS crops and semantic HTML callouts for recommendation, strengths, concerns, and transcript evidence.
- Use a four-option tab list—Recommendation, Strengths, Concerns, Evidence—to change the active crop and annotation.
- Do not create multiple raster copies of the same image unless responsive image performance requires generated sizes.

The section should communicate that every conclusion is inspectable and tied to evidence.

### 7. Old Way vs. RoundZero

Present a visual workflow comparison:

- **Old way:** résumé review → recruiter screen → scheduling → notes → team interview.
- **RoundZero:** post role → ranked evidence.

The old path should feel visibly fragmented; the RoundZero path should feel continuous and calm. Avoid unsourced time-saved or cost-saved metrics.

### 8. Candidate Experience

Retain the adaptive transcript and voice-assessment concepts, redesigned as a polished product scene. Explain that the experience is asynchronous, role-specific, and conversational.

Remove the current named testimonial unless it is verified as a real candidate quote with permission. Do not present fictional quotes as social proof.

### 9. Pricing

Maintain all current plans and entitlement accuracy. Present all four plans—Free, Starter, Growth, and Scale—as elevated summary cards, with Growth receiving the strongest visual emphasis.

Highlight Growth with a restrained iris edge and illumination. Place the detailed feature table behind an accessible `Compare all plans` disclosure that is expanded by default on desktop and collapsed by default on mobile.

Only retain third-party cost comparisons when each claim has a maintainable, authoritative source. Otherwise replace them with a qualitative complexity comparison.

### 10. FAQ and Closing

Keep the FAQ concise and focused on objections that block posting a job. The closing section uses an iris-to-ink field, an oversized line—`Post the role. Skip round one.`—and one primary CTA.

Add `No credit card required` only if the free signup path makes that statement unconditionally accurate.

## Motion

Use one coordinated motion language:

- hero copy resolves first;
- the report frame rises into place;
- evidence cards follow with a short stagger;
- the evidence trail reveals in sequence during scroll;
- interactive product cards shift upward by two pixels on hover and keyboard focus.

Entrance motion should generally complete in under one second. Avoid perpetual floating, cursor-following effects, and animation on every section. Respect `prefers-reduced-motion`; all information and controls must remain available without motion.

## Responsive Behavior

- Preserve clear hierarchy at 320 px and above.
- Remove perspective transforms from product frames on small screens.
- Stack overlapping hero cards in normal document flow on mobile.
- Keep report details legible without requiring horizontal page scrolling.
- Use contained horizontal scrolling only for a comparison table when a stacked alternative would distort plan data.
- Keep primary CTAs reachable and comfortably sized.

## Accessibility

- Preserve the skip link and semantic heading hierarchy.
- Maintain WCAG AA contrast for body text and interactive controls.
- Do not communicate recommendation state by color alone.
- Decorative lighting and grain must be ignored by assistive technology.
- Give every product image meaningful alt text; decorative crops use empty alt text when the full image already communicates the same content.
- Ensure tabbed report callouts, disclosures, and pricing controls are keyboard operable.
- Maintain visible focus states across light and dark surfaces.

## Implementation Boundaries

The redesign is a client-only marketing change. It should not add route loaders, server functions, authentication calls, or database reads.

Primary implementation locations:

- `app/routes/index.tsx` for landing-page structure and local marketing content;
- `app/features/marketing/components/pricing-section.tsx` for pricing presentation;
- `app/styles.css` for narrowly scoped marketing visuals and motion;
- `app/components/public-layout.tsx` only for header/footer changes shared by public pages.

Reuse existing shadcn components and Hugeicons. Do not extract Tailwind class strings into constants in the implementation. Any new component should represent a meaningful, reusable visual unit rather than wrap one call or one element.

## Asset Strategy

Reuse `/public/marketing/report.png` as the primary report asset. Prefer CSS positioning, clipping, and semantic HTML overlays over creating redundant images. New raster assets are not required for the approved design. If implementation reveals that the current screenshot includes obsolete product data, replace it with a fresh capture from a seeded, non-sensitive local account.

Avoid stock photography and abstract 3D objects. The product itself is the visual subject.

## Failure and Content Safety

- If the report asset fails, the hero must preserve its copy, CTA hierarchy, and layout without overlapping broken-image UI.
- Do not invent customer names, logos, quotes, cost savings, or hiring metrics.
- Any third-party pricing claim must be sourced or removed.
- Ensure embedded example candidate information is synthetic and contains no real user data.

## Verification

Implementation is complete when:

- desktop screenshots at approximately 1440 px show the intended light/dark rhythm and readable report details;
- mobile screenshots at 375 px show no overflow, clipped controls, or illegible product crops;
- keyboard navigation reaches navigation, CTAs, report controls, pricing controls, and FAQ in a logical order;
- reduced-motion mode removes marquee and scroll-driven movement without hiding content;
- the page remains usable when the report image is unavailable;
- all plan names, prices, and entitlements still derive from the existing billing configuration;
- `bun run check` passes;
- relevant landing-page tests are added or updated if interactive behavior is introduced.

## Success Criteria

The redesigned page should:

- feel visibly more premium and art-directed than the current flat document layout;
- communicate RoundZero's outcome within the first viewport;
- use the real report as the dominant proof rather than decoration;
- create memorable visual identity through the evidence trail;
- preserve a direct, credible tone for startups and lean hiring teams;
- drive one clear action: post a job.
