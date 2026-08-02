import { describe, expect, it } from "vitest";

import { parseJobImportSource } from "../server/adapters";

describe("parseJobImportSource", () => {
  it("normalizes a Lever response", () => {
    const [candidate] = parseJobImportSource({
      platform: "lever",
      finalUrl: "https://api.lever.co/v0/postings/acme?mode=json",
      text: JSON.stringify([
        {
          id: "lever-1",
          text: "Senior Engineer",
          hostedUrl: "https://jobs.lever.co/acme/lever-1",
          workplaceType: "remote",
          categories: { location: "India", commitment: "Full-time" },
          descriptionPlain: "Build reliable systems.",
          lists: [{ text: "Requirements", content: "TypeScript\n5 years experience" }],
          salaryRange: { min: 100000, max: 150000, currency: "USD", interval: "per-year-salary" },
        },
      ]),
    });
    expect(candidate.job).toMatchObject({
      externalId: "lever-1",
      workplaceType: "remote",
      employmentType: "full_time",
      salaryMin: 100000,
      salaryMax: 150000,
      requirements: ["TypeScript", "5 years experience"],
    });
  });

  it("parses one generic Schema.org JobPosting", () => {
    const [candidate] = parseJobImportSource({
      platform: "generic",
      finalUrl: "https://example.com/jobs/1",
      text: `<html><script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "JobPosting",
        identifier: { value: "job-1" },
        title: "Product Engineer",
        description: "<p>Build the product.</p>",
        employmentType: "FULL_TIME",
        jobLocationType: "TELECOMMUTE",
        validThrough: "2026-12-31T23:59:59Z",
      })}</script></html>`,
    });
    expect(candidate.job).toMatchObject({
      externalId: "job-1",
      title: "Product Engineer",
      description: "Build the product.",
      workplaceType: "remote",
      employmentType: "full_time",
    });
  });

  it("rejects generic pages with multiple JobPosting records", () => {
    const job = { "@type": "JobPosting", title: "Engineer", description: "Build" };
    expect(() =>
      parseJobImportSource({
        platform: "generic",
        finalUrl: "https://example.com/jobs",
        text: `<script type="application/ld+json">${JSON.stringify([job, job])}</script>`,
      }),
    ).toThrow("multiple jobs");
  });
});
