import { describe, expect, it } from "vitest";

import { detectJobImportSource } from "../server/source-detector";

describe("detectJobImportSource", () => {
  it.each([
    [
      "https://boards.greenhouse.io/acme",
      "greenhouse",
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true",
    ],
    ["https://jobs.lever.co/acme", "lever", "https://api.lever.co/v0/postings/acme?mode=json"],
    [
      "https://jobs.ashbyhq.com/acme",
      "ashby",
      "https://api.ashbyhq.com/posting-api/job-board/acme?includeCompensation=true",
    ],
    ["https://acme.recruitee.com", "recruitee", "https://acme.recruitee.com/api/offers/"],
    [
      "https://jobs.smartrecruiters.com/Acme",
      "smartrecruiters",
      "https://api.smartrecruiters.com/v1/companies/Acme/postings?limit=50&destination=PUBLIC",
    ],
  ])("maps %s to its public board API", (input, platform, requestUrl) => {
    expect(detectJobImportSource(input)).toMatchObject({
      platform,
      attempts: [{ requestUrl, acceptedContent: "json" }],
    });
  });

  it.each([
    [
      "https://job-boards.greenhouse.io/acme/jobs/12345?source=careers",
      "https://boards-api.greenhouse.io/v1/boards/acme/jobs/12345?content=true",
    ],
    [
      "https://jobs.lever.co/acme/5b70c01e-2b1a-4d62-a6bf-6a38e3ef5821",
      "https://api.lever.co/v0/postings/acme/5b70c01e-2b1a-4d62-a6bf-6a38e3ef5821",
    ],
    [
      "https://acme.recruitee.com/o/product-engineer?lang=en",
      "https://acme.recruitee.com/api/offers/product-engineer",
    ],
    [
      "https://jobs.smartrecruiters.com/Acme/744000123456789-product-engineer",
      "https://api.smartrecruiters.com/v1/companies/Acme/postings/744000123456789",
    ],
  ])("prefers a single-job API for %s", (input, requestUrl) => {
    const source = detectJobImportSource(input);
    expect(source.attempts[0]).toEqual({ requestUrl, acceptedContent: "json" });
    expect(source.attempts[1]).toMatchObject({ acceptedContent: "html" });
  });

  it("uses Schema.org HTML for an individual Ashby URL", () => {
    expect(
      detectJobImportSource("https://jobs.ashbyhq.com/acme/5b70c01e-2b1a-4d62-a6bf-6a38e3ef5821"),
    ).toMatchObject({
      platform: "ashby",
      attempts: [
        {
          requestUrl: "https://jobs.ashbyhq.com/acme/5b70c01e-2b1a-4d62-a6bf-6a38e3ef5821",
          acceptedContent: "html",
        },
      ],
    });
  });

  it("supports current EU Greenhouse and SmartRecruiters careers hosts", () => {
    expect(detectJobImportSource("https://job-boards.eu.greenhouse.io/acme")).toMatchObject({
      platform: "greenhouse",
      attempts: [
        {
          requestUrl: "https://boards-api.eu.greenhouse.io/v1/boards/acme/jobs?content=true",
        },
      ],
    });
    expect(detectJobImportSource("https://careers.smartrecruiters.com/Acme")).toMatchObject({
      platform: "smartrecruiters",
    });
  });

  it("keeps an unknown public job URL for generic JobPosting parsing", () => {
    expect(detectJobImportSource("https://example.com/jobs/engineer#apply")).toEqual({
      platform: "generic",
      label: "example.com",
      attempts: [{ requestUrl: "https://example.com/jobs/engineer", acceptedContent: "html" }],
    });
  });

  it("rejects non-HTTPS sources", () => {
    expect(() => detectJobImportSource("http://example.com/jobs")).toThrow("HTTPS");
  });
});
