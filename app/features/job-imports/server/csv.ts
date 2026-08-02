import { ExpectedError } from "@/shared/expected-error";

import {
  type JobImportCandidate,
  type JobImportWarning,
  normalizedJobImportSchema,
} from "../schemas";
import {
  finishNormalizedJob,
  normalizeCurrency,
  normalizeDescription,
  normalizeEmploymentType,
  normalizeExperienceLevel,
  normalizeRequirements,
  normalizeSalary,
  normalizeWorkplaceType,
} from "./normalization";

const MAX_CSV_ROWS = 50;

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (quoted) {
    throw new ExpectedError("invalid_input", "The CSV contains an unclosed quoted field.");
  }
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

const normalizeHeader = (header: string): string =>
  header
    .trim()
    .toLowerCase()
    .replaceAll(/[\s-]+/g, "_");

function parsePositiveNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value.replaceAll(",", ""));
  return normalizeSalary(parsed);
}

function parseDate(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fingerprint(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function parseJobImportCsv(csv: string): Promise<JobImportCandidate[]> {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  if (rows.length < 2) {
    throw new ExpectedError("invalid_input", "The CSV must include a header and at least one job.");
  }

  const headers = rows[0].map(normalizeHeader);
  for (const required of ["title", "description"]) {
    if (!headers.includes(required)) {
      throw new ExpectedError(
        "invalid_input",
        `The CSV is missing the required ${required} column.`,
      );
    }
  }
  if (rows.length - 1 > MAX_CSV_ROWS) {
    throw new ExpectedError(
      "invalid_input",
      `CSV imports support up to ${MAX_CSV_ROWS} jobs at once.`,
    );
  }

  return Promise.all(
    rows.slice(1).map(async (values, rowIndex) => {
      const record = new Map(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
      const title = record.get("title") ?? "";
      const description = record.get("description") ?? "";
      if (!title || !description) {
        throw new ExpectedError(
          "invalid_input",
          `CSV row ${rowIndex + 2} must include a title and description.`,
        );
      }

      const warnings: JobImportWarning[] = [];
      const workplaceType = normalizeWorkplaceType(record.get("workplace_type"));
      const employmentType = normalizeEmploymentType(record.get("employment_type"));
      const experienceLevel = normalizeExperienceLevel(record.get("experience_level"));
      const salaryCurrency = normalizeCurrency(record.get("salary_currency"), warnings);
      const sourceUrlValue = record.get("source_url");
      let sourceUrl: string | null = null;
      if (sourceUrlValue) {
        try {
          const parsedUrl = new URL(sourceUrlValue);
          if (parsedUrl.protocol === "https:") sourceUrl = parsedUrl.toString();
        } catch {
          // The warning below gives the user enough context without exposing parser details.
        }
        if (!sourceUrl) {
          warnings.push({
            code: "invalid_source_url",
            field: "sourceUrl",
            message: `CSV row ${rowIndex + 2} contained an invalid source URL, so it was omitted.`,
          });
        }
      }

      const normalizedDescription = normalizeDescription(description, warnings);
      const externalId =
        record.get("external_id") ||
        (await fingerprint(
          JSON.stringify({
            title: title.trim().toLowerCase(),
            location: record.get("location")?.trim().toLowerCase() ?? "",
            description: normalizedDescription,
          }),
        ));
      const job = normalizedJobImportSchema.parse({
        externalId: externalId.slice(0, 500),
        sourceUrl,
        sourceUpdatedAt: null,
        title: title.trim().slice(0, 200),
        description: normalizedDescription,
        requirements: normalizeRequirements(
          (record.get("requirements") ?? "").split("|").filter(Boolean),
          warnings,
        ),
        location: record.get("location")?.slice(0, 200) || null,
        workplaceType,
        employmentType,
        experienceLevel,
        salaryMin: parsePositiveNumber(record.get("salary_min")),
        salaryMax: parsePositiveNumber(record.get("salary_max")),
        salaryCurrency,
        headcount: parsePositiveNumber(record.get("headcount")),
        expiresAt: parseDate(record.get("expires_at")),
      });

      const finished = finishNormalizedJob(job, warnings);
      return { ...finished, inferredFields: [] };
    }),
  );
}
