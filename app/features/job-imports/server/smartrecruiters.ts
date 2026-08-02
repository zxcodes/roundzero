import { z } from "zod";

import { ExpectedError } from "@/shared/expected-error";

import { safeFetchImportSource } from "./safe-fetch";

const postingSummarySchema = z.looseObject({
  id: z.string().optional(),
  uuid: z.string().optional(),
  ref: z.string().optional(),
  jobAd: z.object({ jobDescription: z.string().optional() }).optional(),
});

export async function hydrateSmartRecruitersPostings(
  text: string,
  indexUrl: string,
): Promise<string> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ExpectedError("invalid_input", "SmartRecruiters returned invalid job data.");
  }
  const response = z.object({ content: z.array(z.unknown()) }).parse(raw);
  const url = new URL(indexUrl);
  const path = url.pathname.split("/").filter(Boolean);
  const companyIndex = path.indexOf("companies");
  const company = path[companyIndex + 1];
  if (!company) {
    throw new ExpectedError(
      "invalid_input",
      "The SmartRecruiters company could not be identified.",
    );
  }

  const hydrated: unknown[] = [];
  for (let offset = 0; offset < response.content.length; offset += 5) {
    const chunk = response.content.slice(offset, offset + 5);
    const resolved = await Promise.all(
      chunk.map(async (item) => {
        const summary = postingSummarySchema.safeParse(item);
        if (!summary.success) return item;
        if (summary.data.jobAd?.jobDescription?.trim()) return item;
        const id = summary.data.uuid ?? summary.data.id;
        if (!id) return item;
        const fallback = `${url.origin}/v1/companies/${encodeURIComponent(company)}/postings/${encodeURIComponent(id)}`;
        const detailUrl = summary.data.ref?.startsWith("https://") ? summary.data.ref : fallback;
        try {
          const detail = await safeFetchImportSource(detailUrl, "json");
          const parsedDetail: unknown = JSON.parse(detail.text);
          return parsedDetail;
        } catch {
          return item;
        }
      }),
    );
    hydrated.push(...resolved);
  }
  return JSON.stringify({ content: hydrated });
}
