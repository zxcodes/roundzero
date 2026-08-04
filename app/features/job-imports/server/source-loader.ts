import { ExpectedError } from "@/shared/expected-error";

import type { JobImportCandidate } from "../schemas";
import { parseJobImportSource } from "./adapters";
import { safeFetchImportSource } from "./safe-fetch";
import { hydrateSmartRecruitersPostings } from "./smartrecruiters";
import type { DetectedJobImportSource } from "./source-detector";

const MAX_JOBS = 50;

function blocksFallback(error: unknown): boolean {
  if (!(error instanceof ExpectedError)) return false;
  return [
    "Private or local network",
    "Only public HTTPS",
    "Custom URL ports",
    "redirected too many times",
    "response is too large",
    "took too long to respond",
  ].some((message) => error.message.includes(message));
}

export async function loadJobImportCandidates(
  source: DetectedJobImportSource,
): Promise<JobImportCandidate[]> {
  let lastError: unknown;

  for (const [index, attempt] of source.attempts.entries()) {
    try {
      const response = await safeFetchImportSource(
        attempt.requestUrl,
        attempt.acceptedContent,
        attempt.collectionKey === undefined
          ? undefined
          : {
              collection: {
                key: attempt.collectionKey,
                maxItems: MAX_JOBS,
                filter: attempt.collectionFilter,
              },
            },
      );
      const text = attempt.hydrateSmartRecruiters
        ? await hydrateSmartRecruitersPostings(response.text, response.finalUrl)
        : response.text;
      return parseJobImportSource({
        platform: source.platform,
        text,
        finalUrl: response.finalUrl,
      });
    } catch (error) {
      lastError = error;
      const hasFallback = index < source.attempts.length - 1;
      if (!hasFallback || blocksFallback(error)) break;
    }
  }

  if (lastError instanceof ExpectedError) throw lastError;
  throw new ExpectedError("invalid_input", "The job source returned unsupported job data.");
}
