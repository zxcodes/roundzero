import { describe, expect, it } from "vitest";

import { JOB_IMPORT_CSV_TEMPLATE } from "../csv-template";
import { parseJobImportCsv } from "../server/csv";

describe("parseJobImportCsv", () => {
  it("parses the downloadable template", async () => {
    const [candidate] = await parseJobImportCsv(JOB_IMPORT_CSV_TEMPLATE);
    expect(candidate.job).toMatchObject({
      title: "Senior Product Engineer",
      workplaceType: "hybrid",
      employmentType: "full_time",
      experienceLevel: "senior",
      requirements: ["TypeScript", "System design"],
    });
  });

  it("handles commas and line breaks inside quoted fields", async () => {
    const csv = 'title,description\n"Engineer, Platform","First line\nSecond line"';
    const [candidate] = await parseJobImportCsv(csv);
    expect(candidate.job.title).toBe("Engineer, Platform");
    expect(candidate.job.description).toBe("First line\nSecond line");
  });

  it("requires title and description headers", async () => {
    await expect(parseJobImportCsv("title,location\nEngineer,Remote")).rejects.toThrow(
      "description",
    );
  });
});
