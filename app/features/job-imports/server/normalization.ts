import type { EmploymentType, ExperienceLevel, WorkplaceType } from "@/shared/enums";

import type { JobImportWarning, NormalizedJobImport } from "../schemas";

const DESCRIPTION_LIMIT = 5_000;
const REQUIREMENT_LIMIT = 200;
const SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD", "INR"]);
const POSTGRES_INTEGER_MAX = 2_147_483_647;

const decodeHtmlEntities = (value: string): string =>
  value
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;|&apos;/gi, "'")
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replaceAll(/&#([0-9]+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    );

export const htmlToPlainText = (html: string): string =>
  decodeHtmlEntities(
    html
      .replaceAll(/<\s*br\s*\/?\s*>/gi, "\n")
      .replaceAll(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, "\n")
      .replaceAll(/<\s*li(?:\s[^>]*)?>/gi, "- ")
      .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replaceAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replaceAll(/<[^>]+>/g, " "),
  )
    .replaceAll(/\r/g, "")
    .replaceAll(/[ \t]+\n/g, "\n")
    .replaceAll(/\n[ \t]+/g, "\n")
    .replaceAll(/[ \t]{2,}/g, " ")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();

export function normalizeDescription(value: string, warnings: JobImportWarning[]): string {
  const text = htmlToPlainText(value);
  if (text.length <= DESCRIPTION_LIMIT) return text;
  warnings.push({
    code: "description_shortened",
    field: "description",
    message: "The source description exceeded 5,000 characters and was shortened for RoundZero.",
  });
  return text.slice(0, DESCRIPTION_LIMIT).trimEnd();
}

export function normalizeRequirements(values: string[], warnings: JobImportWarning[]): string[] {
  const normalized = values
    .map((value) =>
      htmlToPlainText(value)
        .replace(/^[-•]\s*/, "")
        .trim(),
    )
    .filter(Boolean)
    .map((value) => {
      if (value.length <= REQUIREMENT_LIMIT) return value;
      warnings.push({
        code: "requirement_shortened",
        field: "requirements",
        message: "A source requirement exceeded 200 characters and was shortened.",
      });
      return value.slice(0, REQUIREMENT_LIMIT).trimEnd();
    });
  return [...new Set(normalized)].slice(0, 30);
}

export function normalizeCurrency(
  value: string | null | undefined,
  warnings: JobImportWarning[],
): string {
  const currency = value?.trim().toUpperCase() || "USD";
  if (SUPPORTED_CURRENCIES.has(currency)) return currency;
  warnings.push({
    code: "unsupported_currency",
    field: "salaryCurrency",
    message: `${currency} is not supported by RoundZero; compensation was omitted.`,
  });
  return "USD";
}

export function normalizeWorkplaceType(value: unknown): WorkplaceType | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replaceAll(/[^a-z]/g, "");
  if (normalized.includes("remote") || normalized === "telecommute") return "remote";
  if (normalized.includes("hybrid")) return "hybrid";
  if (normalized.includes("onsite") || normalized.includes("onlocation")) return "onsite";
  return null;
}

export function normalizeEmploymentType(value: unknown): EmploymentType | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replaceAll(/[^a-z]/g, "");
  if (normalized.includes("intern")) return "internship";
  if (normalized.includes("parttime")) return "part_time";
  if (
    normalized.includes("contract") ||
    normalized.includes("freelance") ||
    normalized.includes("temporary") ||
    normalized.includes("fixedterm")
  ) {
    return "contract";
  }
  if (normalized.includes("fulltime") || normalized.includes("permanent")) return "full_time";
  return null;
}

export function normalizeExperienceLevel(value: unknown): ExperienceLevel | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replaceAll(/[^a-z]/g, "");
  if (normalized.includes("principal")) return "principal";
  if (normalized.includes("staff")) return "staff";
  if (normalized.includes("lead") || normalized.includes("manager")) return "lead";
  if (normalized.includes("senior") || normalized.includes("experienced")) return "senior";
  if (normalized.includes("mid") || normalized.includes("associate")) return "mid";
  if (
    normalized.includes("junior") ||
    normalized.includes("entry") ||
    normalized.includes("student") ||
    normalized.includes("intern")
  ) {
    return "junior";
  }
  return null;
}

export function normalizeSalary(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > POSTGRES_INTEGER_MAX
  )
    return null;
  return value;
}

export function normalizeCompensation(args: {
  minimum: unknown;
  maximum: unknown;
  currency: string | null | undefined;
  warnings: JobImportWarning[];
  context?: string;
}): { salaryMin: number | null; salaryMax: number | null; salaryCurrency: string } {
  const prefix = args.context ? `${args.context} ` : "";
  const suppliedCurrency = args.currency?.trim().toUpperCase() || "USD";
  const salaryCurrency = normalizeCurrency(args.currency, args.warnings);
  let salaryMin = normalizeSalary(args.minimum);
  let salaryMax = normalizeSalary(args.maximum);
  if (args.minimum != null && args.minimum !== "" && salaryMin == null)
    args.warnings.push({
      code: "invalid_salary_min",
      field: "salaryMin",
      message: `${prefix}minimum salary must be a positive whole number no greater than 2,147,483,647; it was omitted.`,
    });
  if (args.maximum != null && args.maximum !== "" && salaryMax == null)
    args.warnings.push({
      code: "invalid_salary_max",
      field: "salaryMax",
      message: `${prefix}maximum salary must be a positive whole number no greater than 2,147,483,647; it was omitted.`,
    });
  if (!SUPPORTED_CURRENCIES.has(suppliedCurrency)) {
    salaryMin = null;
    salaryMax = null;
  }
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
    args.warnings.push({
      code: "reversed_salary_range",
      field: "salaryMin",
      message: `${prefix}minimum salary exceeded maximum salary, so compensation was omitted.`,
    });
    salaryMin = null;
    salaryMax = null;
  }
  return { salaryMin, salaryMax, salaryCurrency };
}

export function finishNormalizedJob(
  job: NormalizedJobImport,
  warnings: JobImportWarning[],
): { job: NormalizedJobImport; warnings: JobImportWarning[] } {
  if (!job.workplaceType) {
    warnings.push({
      code: "missing_workplace_type",
      field: "workplaceType",
      message: "Choose whether this role is remote, hybrid, or on-site before importing.",
    });
  }
  if (!job.employmentType) {
    warnings.push({
      code: "missing_employment_type",
      field: "employmentType",
      message: "Choose an employment type before importing.",
    });
  }
  if (!job.experienceLevel) {
    warnings.push({
      code: "missing_experience_level",
      field: "experienceLevel",
      message: "Choose an experience level before importing.",
    });
  }
  return { job, warnings };
}
