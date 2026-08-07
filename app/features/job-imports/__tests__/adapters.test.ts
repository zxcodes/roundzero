import { describe, expect, it } from "vitest";

import { parseJobImportSource } from "../server/adapters";

describe("parseJobImportSource", () => {
  it("normalizes a single Greenhouse response", () => {
    const [candidate] = parseJobImportSource({
      platform: "greenhouse",
      finalUrl: "https://boards-api.greenhouse.io/v1/boards/acme/jobs/123?content=true",
      text: JSON.stringify({
        id: 123,
        title: "Product Engineer",
        content: "<p>Build reliable products.</p>",
        absolute_url: "https://job-boards.greenhouse.io/acme/jobs/123",
        location: { name: "New York, NY" },
      }),
    });

    expect(candidate.job).toMatchObject({
      externalId: "123",
      title: "Product Engineer",
      description: "Build reliable products.",
      location: "New York, NY",
    });
  });

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
    });
    expect(candidate.job.description).toContain("TypeScript");
    expect(candidate.job.description).toContain("5 years experience");
  });

  it("normalizes a single Lever response", () => {
    const [candidate] = parseJobImportSource({
      platform: "lever",
      finalUrl: "https://api.lever.co/v0/postings/acme/lever-1",
      text: JSON.stringify({
        id: "lever-1",
        text: "Product Engineer",
        hostedUrl: "https://jobs.lever.co/acme/lever-1",
        descriptionPlain: "Build reliable products.",
      }),
    });

    expect(candidate.job).toMatchObject({ externalId: "lever-1", title: "Product Engineer" });
  });

  it("uses Schema.org data for an individual Ashby page", () => {
    const [candidate] = parseJobImportSource({
      platform: "ashby",
      finalUrl: "https://jobs.ashbyhq.com/acme/ashby-1",
      text: `<script type="application/ld+json">${JSON.stringify({
        "@type": "JobPosting",
        identifier: { value: "ashby-1" },
        title: "Product Engineer",
        description: "<p>Build reliable products.</p>",
        url: "https://jobs.ashbyhq.com/acme/ashby-1",
      })}</script>`,
    });

    expect(candidate.job).toMatchObject({ externalId: "ashby-1", title: "Product Engineer" });
  });

  it("normalizes a single Recruitee offer response", () => {
    const [candidate] = parseJobImportSource({
      platform: "recruitee",
      finalUrl: "https://acme.recruitee.com/api/offers/product-engineer",
      text: JSON.stringify({
        offer: {
          id: 123,
          title: "Product Engineer",
          description: "<p>Build reliable products.</p>",
          careers_url: "https://acme.recruitee.com/o/product-engineer",
        },
      }),
    });

    expect(candidate.job).toMatchObject({ externalId: "123", title: "Product Engineer" });
  });

  it.each([
    {
      name: "current nested",
      jobAd: {
        sections: {
          jobDescription: { text: "<p>Build reliable products.</p>" },
          qualifications: { text: "<p>TypeScript</p>" },
        },
      },
    },
    {
      name: "legacy flat",
      jobAd: {
        jobDescription: "<p>Build reliable products.</p>",
        qualifications: "<p>TypeScript</p>",
      },
    },
  ])("normalizes a $name SmartRecruiters response", ({ jobAd }) => {
    const [candidate] = parseJobImportSource({
      platform: "smartrecruiters",
      finalUrl: "https://api.smartrecruiters.com/v1/companies/Acme/postings/123",
      text: JSON.stringify({
        id: "123",
        uuid: "smart-1",
        name: "Product Engineer",
        postingUrl: "https://jobs.smartrecruiters.com/Acme/123-product-engineer",
        jobAd,
      }),
    });

    expect(candidate.job).toMatchObject({
      externalId: "smart-1",
      title: "Product Engineer",
      description: "Build reliable products.\n\nTypeScript",
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
      externalId: "https://example.com:job-1",
      title: "Product Engineer",
      description: "Build the product.",
      workplaceType: "remote",
      employmentType: "full_time",
    });
  });

  it("namespaces generic identifiers by source origin", () => {
    const text = `<script type="application/ld+json">${JSON.stringify({
      "@type": "JobPosting",
      identifier: { value: "123" },
      title: "Engineer",
      description: "Build reliable products.",
    })}</script>`;
    const [first] = parseJobImportSource({
      platform: "generic",
      finalUrl: "https://first.example/jobs/123",
      text,
    });
    const [second] = parseJobImportSource({
      platform: "generic",
      finalUrl: "https://second.example/jobs/123",
      text,
    });

    expect(first.job.externalId).toBe("https://first.example:123");
    expect(second.job.externalId).toBe("https://second.example:123");
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
