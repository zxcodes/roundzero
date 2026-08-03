import { ExpectedError } from "@/shared/expected-error";

import type { JobImportSourcePlatform } from "../schemas";

export type DetectedJobImportSource = {
  platform: Exclude<JobImportSourcePlatform, "csv">;
  label: string;
  attempts: JobImportFetchAttempt[];
};

export type JobImportFetchAttempt = {
  requestUrl: string;
  acceptedContent: "json" | "html";
  collectionKey?: "jobs" | "offers" | "content" | null;
  collectionFilter?: "listed";
  hydrateSmartRecruiters?: boolean;
};

const pathParts = (url: URL): string[] => url.pathname.split("/").filter(Boolean);

function requiredIdentifier(value: string | undefined, platform: string): string {
  if (!value) {
    throw new ExpectedError("invalid_input", `Enter a valid ${platform} careers page URL.`);
  }
  return value;
}

export function detectJobImportSource(input: string): DetectedJobImportSource {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ExpectedError("invalid_input", "Enter a valid careers page or job URL.");
  }

  if (url.protocol !== "https:") {
    throw new ExpectedError("invalid_input", "Job imports only support secure HTTPS URLs.");
  }

  url.hash = "";
  const hostname = url.hostname.toLowerCase();
  const parts = pathParts(url);

  if (
    hostname === "boards.greenhouse.io" ||
    hostname === "job-boards.greenhouse.io" ||
    hostname === "boards.eu.greenhouse.io" ||
    hostname === "job-boards.eu.greenhouse.io"
  ) {
    const board = requiredIdentifier(parts[0], "Greenhouse");
    const jobId = parts[1] === "jobs" ? parts[2] : undefined;
    const apiHost = hostname.includes(".eu.")
      ? "https://boards-api.eu.greenhouse.io"
      : "https://boards-api.greenhouse.io";
    return {
      platform: "greenhouse",
      label: `Greenhouse · ${board}`,
      attempts: jobId
        ? [
            {
              requestUrl: `${apiHost}/v1/boards/${encodeURIComponent(board)}/jobs/${encodeURIComponent(jobId)}?content=true`,
              acceptedContent: "json",
            },
            { requestUrl: url.toString(), acceptedContent: "html" },
          ]
        : [
            {
              requestUrl: `${apiHost}/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
              acceptedContent: "json",
              collectionKey: "jobs",
            },
          ],
    };
  }

  if (hostname === "jobs.lever.co" || hostname === "jobs.eu.lever.co") {
    const company = requiredIdentifier(parts[0], "Lever");
    const postingId = parts[1];
    const apiHost = hostname.includes(".eu.") ? "https://api.eu.lever.co" : "https://api.lever.co";
    return {
      platform: "lever",
      label: `Lever · ${company}`,
      attempts: postingId
        ? [
            {
              requestUrl: `${apiHost}/v0/postings/${encodeURIComponent(company)}/${encodeURIComponent(postingId)}`,
              acceptedContent: "json",
            },
            { requestUrl: url.toString(), acceptedContent: "html" },
          ]
        : [
            {
              requestUrl: `${apiHost}/v0/postings/${encodeURIComponent(company)}?mode=json`,
              acceptedContent: "json",
              collectionKey: null,
            },
          ],
    };
  }

  if (hostname === "jobs.ashbyhq.com") {
    const board = requiredIdentifier(parts[0], "Ashby");
    const postingId = parts[1];
    return {
      platform: "ashby",
      label: `Ashby · ${board}`,
      attempts: postingId
        ? [{ requestUrl: url.toString(), acceptedContent: "html" }]
        : [
            {
              requestUrl: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
              acceptedContent: "json",
              collectionKey: "jobs",
              collectionFilter: "listed",
            },
          ],
    };
  }

  if (hostname.endsWith(".recruitee.com")) {
    const subdomain = hostname.slice(0, -".recruitee.com".length);
    if (!subdomain || subdomain.includes(".")) {
      throw new ExpectedError("invalid_input", "Enter a valid Recruitee careers page URL.");
    }
    const offerSlug = parts[0] === "o" ? parts[1] : undefined;
    return {
      platform: "recruitee",
      label: `Recruitee · ${subdomain}`,
      attempts: offerSlug
        ? [
            {
              requestUrl: `https://${subdomain}.recruitee.com/api/offers/${encodeURIComponent(offerSlug)}`,
              acceptedContent: "json",
            },
            { requestUrl: url.toString(), acceptedContent: "html" },
          ]
        : [
            {
              requestUrl: `https://${subdomain}.recruitee.com/api/offers/`,
              acceptedContent: "json",
              collectionKey: "offers",
            },
          ],
    };
  }

  if (hostname === "jobs.smartrecruiters.com" || hostname === "careers.smartrecruiters.com") {
    const company = requiredIdentifier(parts[0], "SmartRecruiters");
    const postingId = parts[1]?.match(/^\d+/)?.[0];
    return {
      platform: "smartrecruiters",
      label: `SmartRecruiters · ${company}`,
      attempts: postingId
        ? [
            {
              requestUrl: `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings/${encodeURIComponent(postingId)}`,
              acceptedContent: "json",
            },
            { requestUrl: url.toString(), acceptedContent: "html" },
          ]
        : [
            {
              requestUrl: `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings?limit=50&destination=PUBLIC`,
              acceptedContent: "json",
              collectionKey: "content",
              hydrateSmartRecruiters: true,
            },
          ],
    };
  }

  return {
    platform: "generic",
    label: url.hostname,
    attempts: [{ requestUrl: url.toString(), acceptedContent: "html" }],
  };
}
