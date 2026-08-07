import { NodeHtmlMarkdown } from "node-html-markdown";

import { MAX_JOB_DESCRIPTION_LENGTH } from "@/features/jobs/constants";
import { markdownToPlainText } from "@/features/jobs/markdown";
import type { EmploymentType, ExperienceLevel, WorkplaceType } from "@/shared/enums";

import type { JobImportWarning, NormalizedJobImport } from "../schemas";

const REQUIREMENT_LIMIT = 200;
const SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD", "INR"]);
const POSTGRES_INTEGER_MAX = 2_147_483_647;
const HTML_TAG_PATTERN =
  /<\/?(?:a|abbr|address|area|article|aside|audio|b|base|bdi|bdo|blockquote|body|br|button|canvas|caption|cite|code|col|colgroup|data|datalist|dd|del|details|dfn|dialog|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|h[1-6]|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|label|legend|li|link|main|map|mark|menu|meta|meter|nav|noscript|object|ol|optgroup|option|output|p|picture|pre|progress|q|rp|rt|ruby|s|samp|script|search|section|select|slot|small|source|span|strong|style|sub|summary|sup|table|tbody|td|template|textarea|tfoot|th|thead|time|title|tr|track|u|ul|var|video|wbr)(?=[\s/>])/i;

const decodeHtmlEntities = (value: string): string =>
  value
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&nbsp;|&ensp;|&emsp;|&thinsp;/gi, " ")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;|&apos;/gi, "'")
    .replaceAll(/&lsquo;/gi, "‘")
    .replaceAll(/&rsquo;/gi, "’")
    .replaceAll(/&ldquo;/gi, "“")
    .replaceAll(/&rdquo;/gi, "”")
    .replaceAll(/&ndash;/gi, "–")
    .replaceAll(/&mdash;/gi, "—")
    .replaceAll(/&bull;/gi, "•")
    .replaceAll(/&hellip;/gi, "…")
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replaceAll(/&#([0-9]+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    );

const decodeEscapedHtml = (value: string): string => {
  let decoded = value;
  for (let pass = 0; pass < 2; pass += 1) {
    const next = decodeHtmlEntities(decoded);
    if (next === decoded) return decoded;
    decoded = next;
  }
  return decoded;
};

const stripUnsafeHtml = (html: string): string =>
  decodeEscapedHtml(html)
    .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replaceAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replaceAll(/<!--[\s\S]*?-->/g, "");

const looksLikeHtml = (value: string): boolean => HTML_TAG_PATTERN.test(value);

export function htmlToMarkdown(value: string): string {
  const decoded = decodeEscapedHtml(value);
  if (!looksLikeHtml(decoded)) return decoded.replaceAll("\0", "").trim();

  return NodeHtmlMarkdown.translate(stripUnsafeHtml(decoded), {
    bulletMarker: "-",
    keepDataImages: false,
  })
    .replaceAll(/\r/g, "")
    .replaceAll(/[ \t]+\n/g, "\n")
    .replaceAll(/\n[ \t]+/g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

export const htmlToPlainText = (html: string): string => markdownToPlainText(htmlToMarkdown(html));

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
        field: "description",
        message: "A source qualification exceeded 200 characters and was shortened.",
      });
      return value.slice(0, REQUIREMENT_LIMIT).trimEnd();
    });
  return [...new Set(normalized)].slice(0, 30);
}

function getMissingRequirements(description: string, requirements: string[]): string[] {
  const descriptionLines = new Set(
    markdownToPlainText(description)
      .split("\n")
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean),
  );
  return requirements.filter((requirement) => !descriptionLines.has(requirement.toLowerCase()));
}

function hasFinalRequirementsHeading(description: string): boolean {
  const headings = description.matchAll(/^#{1,6}\s+(.+?)\s*$/gm);
  let finalHeading = "";
  for (const heading of headings) finalHeading = heading[1] ?? "";
  return /^(requirements|qualifications)(?:\s|$)/i.test(finalHeading);
}

function formatRequirementsAppendix(
  description: string,
  requirements: string[],
  forceHeading = false,
): string {
  const missing = getMissingRequirements(description, requirements);
  if (missing.length === 0) return "";
  const heading =
    !forceHeading && hasFinalRequirementsHeading(description) ? "" : "## Requirements\n\n";
  return `${heading}${missing.map((item) => `- ${item}`).join("\n")}`;
}

function combineDescriptionAndRequirements(description: string, appendix: string): string {
  return [description.trimEnd(), appendix].filter(Boolean).join("\n\n");
}

function escapeMarkdownText(value: string): string {
  return value.replaceAll(/([\\`*_{}[\]()<>#+.!|~-])/g, "\\$1");
}

function truncateMarkdownAtBoundary(markdown: string, maximumLength: number): string {
  if (markdown.length <= maximumLength) return markdown.trimEnd();
  const lines = markdown.split("\n");
  let length = 0;
  let boundary = 0;
  let fence: string | null = null;

  for (const line of lines) {
    const nextLength = length + line.length + (length > 0 ? 1 : 0);
    if (nextLength > maximumLength) break;
    length = nextLength;

    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1]?.[0];
      if (!fence) fence = marker ?? null;
      else if (marker === fence) fence = null;
    }
    if (!fence && line.trim() === "") boundary = length - 1;
  }

  if (boundary > 0) return markdown.slice(0, boundary).trimEnd();

  const plainText = markdownToPlainText(markdown);
  const candidate = plainText.slice(0, maximumLength).trimEnd();
  const wordBoundary = candidate.lastIndexOf(" ");
  const truncated = wordBoundary > 0 ? candidate.slice(0, wordBoundary) : candidate;
  return escapeMarkdownText(truncated.trimEnd());
}

export function normalizeDescription(
  value: string,
  warnings: JobImportWarning[],
  requirements: string[] = [],
): string {
  const description = htmlToMarkdown(value);
  const normalizedRequirements = normalizeRequirements(requirements, warnings);
  const markdown = combineDescriptionAndRequirements(
    description,
    formatRequirementsAppendix(description, normalizedRequirements),
  );
  if (markdown.length <= MAX_JOB_DESCRIPTION_LENGTH) return markdown;
  warnings.push({
    code: "description_shortened",
    field: "description",
    message: `The source description exceeded ${MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()} characters and was shortened for RoundZero.`,
  });
  const requirementsAppendix = formatRequirementsAppendix("", normalizedRequirements, true);
  if (!requirementsAppendix)
    return truncateMarkdownAtBoundary(description, MAX_JOB_DESCRIPTION_LENGTH);

  const separatorLength = description ? 2 : 0;
  const availableDescriptionLength =
    MAX_JOB_DESCRIPTION_LENGTH - requirementsAppendix.length - separatorLength;
  const shortenedDescription = truncateMarkdownAtBoundary(description, availableDescriptionLength);
  return combineDescriptionAndRequirements(shortenedDescription, requirementsAppendix);
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
