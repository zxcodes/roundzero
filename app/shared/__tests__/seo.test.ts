import { describe, expect, it } from "vitest";

import {
  absoluteUrl,
  buildBreadcrumbSchema,
  buildHomepageSchema,
  buildJobPostingSchema,
  buildOrganizationSchema,
  buildPageHead,
  escapeXml,
  homepageJsonLd,
  type JobPostingSchemaInput,
  NOINDEX_ROBOTS,
} from "@/shared/seo";

const job = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Product Designer",
  description: "Design accessible hiring workflows.",
  companyName: "Example & Co",
  companySlug: "example-and-co",
  createdAt: "2026-07-01T00:00:00.000Z",
  employmentType: "full_time",
  location: "Remote (USA)",
  workplaceType: "remote",
  salaryMin: 90_000,
  salaryMax: 120_000,
  salaryCurrency: "USD",
  expiresAt: "2026-08-01T00:00:00.000Z",
  requirements: ["Product design", "User research"],
} satisfies JobPostingSchemaInput;

describe("SEO metadata", () => {
  it("builds canonical and complete social metadata", () => {
    const head = buildPageHead({
      title: "Example | RoundZero",
      description: "Example description",
      path: "/example",
      robots: NOINDEX_ROBOTS,
    });

    expect(head.links).toEqual([{ rel: "canonical", href: absoluteUrl("/example") }]);
    expect(head.meta).toContainEqual({ name: "robots", content: NOINDEX_ROBOTS });
    expect(head.meta).toContainEqual({ property: "og:type", content: "website" });
    expect(head.meta).toContainEqual({ name: "twitter:card", content: "summary_large_image" });
    expect(head.meta).toContainEqual({
      property: "og:image:alt",
      content: "RoundZero — review candidates, not resumes",
    });
  });
});

describe("structured data", () => {
  it("describes only truthful homepage entities", () => {
    const schema = buildHomepageSchema([
      { question: "How does it work?", answer: "RoundZero runs an adaptive interview." },
    ]);

    expect(schema).toMatchObject({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", name: "RoundZero" },
        { "@type": "WebSite", name: "RoundZero" },
        {
          "@type": "SoftwareApplication",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How does it work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "RoundZero runs an adaptive interview.",
              },
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(schema)).not.toContain("aggregateRating");
    expect(JSON.stringify(schema)).not.toContain('"offers"');
  });

  it("serializes JSON-LD without allowing a closing script tag", () => {
    const script = homepageJsonLd([
      { question: "Can </script> end this tag?", answer: "No <script> can execute." },
    ]);

    expect(script.children).not.toContain("</script>");
    expect(JSON.parse(script.children)).toMatchObject({ "@context": "https://schema.org" });
  });

  it("builds Google Jobs salary and remote-work properties", () => {
    const schema = buildJobPostingSchema(job);

    expect(schema).toMatchObject({
      "@type": "JobPosting",
      directApply: true,
      employmentType: "FULL_TIME",
      jobLocationType: "TELECOMMUTE",
      applicantLocationRequirements: { "@type": "Country", name: "US" },
      baseSalary: {
        "@type": "MonetaryAmount",
        currency: "USD",
        value: {
          "@type": "QuantitativeValue",
          minValue: 90_000,
          maxValue: 120_000,
          unitText: "YEAR",
        },
      },
    });
    expect(schema).not.toHaveProperty("jobLocation");
  });

  it("omits Google Jobs markup when a free-form location lacks a country", () => {
    expect(buildJobPostingSchema({ ...job, location: "Remote" })).toBeNull();
    expect(buildJobPostingSchema({ ...job, location: "Remote (US timezones)" })).toBeNull();
    expect(buildJobPostingSchema({ ...job, location: "Remote (EU)" })).toBeNull();
  });

  it("builds a country-qualified physical job location", () => {
    expect(
      buildJobPostingSchema({
        ...job,
        location: "New York, NY",
        workplaceType: "on_site",
      }),
    ).toMatchObject({
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: "New York",
          addressRegion: "NY",
          addressCountry: "US",
        },
      },
    });
  });

  it("uses the RoundZero profile as a company's canonical entity URL", () => {
    const schema = buildOrganizationSchema({
      name: "Example & Co",
      slug: "example-and-co",
      description: "A product company.",
      website: "https://example.com",
      industry: "technology",
      foundedYear: 2020,
    });

    expect(schema).toMatchObject({
      "@type": "Organization",
      url: absoluteUrl("/companies/example-and-co"),
      sameAs: "https://example.com",
      foundingDate: "2020",
    });
  });

  it("builds ordered, canonical breadcrumbs", () => {
    expect(
      buildBreadcrumbSchema([
        { name: "Jobs", path: "/jobs" },
        { name: "Product Designer", path: `/jobs/${job.id}` },
      ]),
    ).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Jobs", item: absoluteUrl("/jobs") },
        { position: 2, name: "Product Designer", item: absoluteUrl(`/jobs/${job.id}`) },
      ],
    });
  });
});

describe("XML output", () => {
  it("escapes XML-reserved characters", () => {
    expect(escapeXml(`A&B <tag> "quote" 'apostrophe'`)).toBe(
      "A&amp;B &lt;tag&gt; &quot;quote&quot; &apos;apostrophe&apos;",
    );
  });
});
