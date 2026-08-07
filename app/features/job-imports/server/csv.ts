import { ExpectedError } from "@/shared/expected-error";

import {
  type JobImportCandidate,
  type JobImportWarning,
  normalizedJobImportSchema,
} from "../schemas";
import {
  finishNormalizedJob,
  normalizeCompensation,
  normalizeDescription,
  normalizeEmploymentType,
  normalizeExperienceLevel,
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
        if (
          input[index + 1] !== "," &&
          input[index + 1] !== "\r" &&
          input[index + 1] !== "\n" &&
          input[index + 1] !== undefined
        ) {
          throw new ExpectedError(
            "invalid_input",
            "A quoted CSV field must end before a comma or line break.",
          );
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === '"') {
      throw new ExpectedError(
        "invalid_input",
        "A quote may only appear at the start of a CSV field.",
      );
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

function parseNumber(value: string | undefined): number | null | string {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (!/^(?:0|[1-9]\d*)$/.test(trimmed)) return value;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : value;
}

function parseDate(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date.toISOString();
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
  const duplicateHeader = headers.find((header, index) => headers.indexOf(header) !== index);
  if (duplicateHeader) {
    throw new ExpectedError(
      "invalid_input",
      `The CSV contains duplicate ${duplicateHeader} columns.`,
    );
  }
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

  const candidates = await Promise.all(
    rows.slice(1).map(async (values, rowIndex) => {
      if (values.length !== headers.length) {
        throw new ExpectedError(
          "invalid_input",
          `CSV row ${rowIndex + 2} has ${values.length} columns but the header has ${headers.length}.`,
        );
      }
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
      const rowLabel = `CSV row ${rowIndex + 2}`;
      const compensation = normalizeCompensation({
        minimum: parseNumber(record.get("salary_min")),
        maximum: parseNumber(record.get("salary_max")),
        currency: record.get("salary_currency"),
        warnings,
        context: rowLabel,
      });
      const rawHeadcount = parseNumber(record.get("headcount"));
      const headcount =
        typeof rawHeadcount === "number" &&
        Number.isInteger(rawHeadcount) &&
        rawHeadcount > 0 &&
        rawHeadcount <= 2_147_483_647
          ? rawHeadcount
          : null;
      if (rawHeadcount != null && headcount == null) {
        warnings.push({
          code: "invalid_headcount",
          field: "headcount",
          message: `${rowLabel} headcount must be a positive whole number no greater than 2,147,483,647; it was omitted.`,
        });
      }
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

      const normalizedDescription = normalizeDescription(
        description,
        warnings,
        (record.get("requirements") ?? "").split("|").filter(Boolean),
      );
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
        location: record.get("location")?.slice(0, 200) || null,
        workplaceType,
        employmentType,
        experienceLevel,
        salaryMin: compensation.salaryMin,
        salaryMax: compensation.salaryMax,
        salaryCurrency: compensation.salaryCurrency,
        headcount,
        expiresAt: parseDate(record.get("expires_at")),
      });

      if (record.get("expires_at") && !job.expiresAt) {
        warnings.push({
          code: "invalid_expiry_date",
          field: "expiresAt",
          message: `${rowLabel} expires_at must be a valid date; it was omitted.`,
        });
      }

      const finished = finishNormalizedJob(job, warnings);
      return { ...finished, inferredFields: [] };
    }),
  );

  const seen = new Map<string, number>();
  for (const [index, candidate] of candidates.entries()) {
    const prior = seen.get(candidate.job.externalId);
    if (prior != null) {
      throw new ExpectedError(
        "invalid_input",
        `CSV rows ${prior + 2} and ${index + 2} have the same external ID or job fingerprint. Give each job a unique external_id, title, location, or description.`,
      );
    }
    seen.set(candidate.job.externalId, index);
  }
  return candidates;
}
