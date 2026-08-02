import { ExpectedError } from "@/shared/expected-error";

import type { JobImportSourcePlatform } from "../schemas";

export type DetectedJobImportSource = {
  platform: Exclude<JobImportSourcePlatform, "csv">;
  label: string;
  requestUrl: string;
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

  const hostname = url.hostname.toLowerCase();
  const parts = pathParts(url);

  if (
    hostname === "boards.greenhouse.io" ||
    hostname === "job-boards.greenhouse.io" ||
    hostname === "boards.eu.greenhouse.io"
  ) {
    const board = requiredIdentifier(parts[0], "Greenhouse");
    const apiHost = hostname.includes(".eu.")
      ? "https://boards-api.eu.greenhouse.io"
      : "https://boards-api.greenhouse.io";
    return {
      platform: "greenhouse",
      label: `Greenhouse · ${board}`,
      requestUrl: `${apiHost}/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
    };
  }

  if (hostname === "jobs.lever.co" || hostname === "jobs.eu.lever.co") {
    const company = requiredIdentifier(parts[0], "Lever");
    const apiHost = hostname.includes(".eu.") ? "https://api.eu.lever.co" : "https://api.lever.co";
    return {
      platform: "lever",
      label: `Lever · ${company}`,
      requestUrl: `${apiHost}/v0/postings/${encodeURIComponent(company)}?mode=json`,
    };
  }

  if (hostname === "jobs.ashbyhq.com") {
    const board = requiredIdentifier(parts[0], "Ashby");
    return {
      platform: "ashby",
      label: `Ashby · ${board}`,
      requestUrl: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
    };
  }

  if (hostname.endsWith(".recruitee.com")) {
    const subdomain = hostname.slice(0, -".recruitee.com".length);
    if (!subdomain || subdomain.includes(".")) {
      throw new ExpectedError("invalid_input", "Enter a valid Recruitee careers page URL.");
    }
    return {
      platform: "recruitee",
      label: `Recruitee · ${subdomain}`,
      requestUrl: `https://${subdomain}.recruitee.com/api/offers/`,
    };
  }

  if (hostname === "jobs.smartrecruiters.com") {
    const company = requiredIdentifier(parts[0], "SmartRecruiters");
    return {
      platform: "smartrecruiters",
      label: `SmartRecruiters · ${company}`,
      requestUrl: `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings?limit=50&destination=PUBLIC`,
    };
  }

  url.hash = "";
  return {
    platform: "generic",
    label: url.hostname,
    requestUrl: url.toString(),
  };
}
