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
    });
    expect(candidate.job.description).toContain("## About the role");
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

  it("omits unsafe compensation and reports actionable numeric and date warnings", async () => {
    const [unsupported] = await parseJobImportCsv(
      "title,description,salary_min,salary_max,salary_currency,headcount,expires_at\nEngineer,Build,10,20,JPY,1.5,not-a-date",
    );
    expect(unsupported.job).toMatchObject({
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: "USD",
      headcount: null,
      expiresAt: null,
    });
    expect(unsupported.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["unsupported_currency", "invalid_headcount", "invalid_expiry_date"]),
    );

    const [reversed] = await parseJobImportCsv(
      "title,description,salary_min,salary_max\nEngineer,Build,200,100",
    );
    expect(reversed.job).toMatchObject({ salaryMin: null, salaryMax: null });
    expect(reversed.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "reversed_salary_range" })]),
    );
  });

  it("names conflicting rows with duplicate external IDs or fingerprints", async () => {
    await expect(
      parseJobImportCsv("title,description,external_id\nA,One,same\nB,Two,same"),
    ).rejects.toThrow("rows 2 and 3");
    await expect(parseJobImportCsv("title,description\nA,One\nA,One")).rejects.toThrow(
      "fingerprint",
    );
  });

  it("rejects malformed CSV structure and quote positions", async () => {
    await expect(parseJobImportCsv("title,Title,description\nA,B,Build")).rejects.toThrow(
      "duplicate title",
    );
    await expect(parseJobImportCsv("title,description\nA,Build,extra")).rejects.toThrow(
      "row 2 has 3 columns",
    );
    await expect(parseJobImportCsv('title,description\nA,Bad"quote')).rejects.toThrow(
      "start of a CSV field",
    );
    await expect(parseJobImportCsv('title,description\nA,"closed"junk')).rejects.toThrow(
      "before a comma or line break",
    );
  });

  it("uses strict whole-number and calendar-date syntax", async () => {
    const [parsed] = await parseJobImportCsv(
      'title,description,salary_min,headcount,expires_at\nA,Build,"1,00",+2,2026-02-30',
    );
    expect(parsed.job).toMatchObject({ salaryMin: null, headcount: null, expiresAt: null });
    expect(parsed.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["invalid_salary_min", "invalid_headcount", "invalid_expiry_date"]),
    );
  });
});
