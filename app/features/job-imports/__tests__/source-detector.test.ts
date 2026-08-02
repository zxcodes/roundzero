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
  ])("maps %s to its public API", (input, platform, requestUrl) => {
    expect(detectJobImportSource(input)).toMatchObject({ platform, requestUrl });
  });

  it("keeps an unknown public job URL for generic JobPosting parsing", () => {
    expect(detectJobImportSource("https://example.com/jobs/engineer#apply")).toEqual({
      platform: "generic",
      label: "example.com",
      requestUrl: "https://example.com/jobs/engineer",
    });
  });

  it("rejects non-HTTPS sources", () => {
    expect(() => detectJobImportSource("http://example.com/jobs")).toThrow("HTTPS");
  });
});
