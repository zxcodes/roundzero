import { afterEach, describe, expect, it, vi } from "vitest";

import { hydrateSmartRecruitersPostings } from "../server/smartrecruiters";
import { detectJobImportSource } from "../server/source-detector";
import { loadJobImportCandidates } from "../server/source-loader";

afterEach(() => vi.unstubAllGlobals());

describe("loadJobImportCandidates", () => {
  it("falls back from a missing single-job API to Schema.org on the public page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 404, headers: { "content-type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(
          `<script type="application/ld+json">${JSON.stringify({
            "@type": "JobPosting",
            identifier: { value: "job-1" },
            title: "Product Engineer",
            description: "Build reliable products.",
          })}</script>`,
          { headers: { "content-type": "text/html" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const candidates = await loadJobImportCandidates(
      detectJobImportSource("https://job-boards.greenhouse.io/acme/jobs/123"),
    );

    expect(candidates[0]?.job.title).toBe("Product Engineer");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not bypass a private-network redirect through a fallback", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://169.254.169.254/latest/meta-data" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      loadJobImportCandidates(
        detectJobImportSource("https://job-boards.greenhouse.io/acme/jobs/123"),
      ),
    ).rejects.toThrow("Private or local");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("hydrateSmartRecruitersPostings", () => {
  it("uses the public numeric posting id instead of the UUID for details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "123",
          uuid: "b87a2224-ece0-44b9-83a6-9167a87e0945",
          name: "Product Engineer",
          jobAd: { sections: { jobDescription: { text: "Build reliable products." } } },
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const hydrated = await hydrateSmartRecruitersPostings(
      JSON.stringify({
        content: [
          {
            id: "123",
            uuid: "b87a2224-ece0-44b9-83a6-9167a87e0945",
            name: "Product Engineer",
          },
        ],
      }),
      "https://api.smartrecruiters.com/v1/companies/Acme/postings?limit=50",
    );

    expect(JSON.parse(hydrated).content[0].jobAd.sections.jobDescription.text).toBe(
      "Build reliable products.",
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.smartrecruiters.com/v1/companies/Acme/postings/123",
    );
  });
});
