import { z } from "zod";

import { ExpectedError } from "@/shared/expected-error";

import {
  type JobImportCandidate,
  type JobImportSourcePlatform,
  type JobImportWarning,
  normalizedJobImportSchema,
} from "../schemas";
import {
  finishNormalizedJob,
  htmlToPlainText,
  normalizeCompensation,
  normalizeDescription,
  normalizeEmploymentType,
  normalizeExperienceLevel,
  normalizeRequirements,
  normalizeSalary,
  normalizeWorkplaceType,
} from "./normalization";

const MAX_JOBS = 50;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ExpectedError("invalid_input", "The job source returned invalid JSON.");
  }
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeUrl(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const parsed = z.url().safeParse(value);
    if (parsed.success && value.startsWith("https://")) return value;
  }
  return fallback;
}

function titleWithWarning(value: string, warnings: JobImportWarning[]): string {
  const title = htmlToPlainText(value);
  if (title.length <= 200) return title;
  warnings.push({
    code: "title_shortened",
    field: "title",
    message: "The source title exceeded 200 characters and was shortened.",
  });
  return title.slice(0, 200).trimEnd();
}

function candidate(args: {
  platform: JobImportSourcePlatform;
  externalId: string;
  sourceUrl: string;
  sourceUpdatedAt?: unknown;
  title: string;
  description: string;
  requirements?: string[];
  location?: string | null;
  workplaceType?: unknown;
  employmentType?: unknown;
  experienceLevel?: unknown;
  salaryMin?: unknown;
  salaryMax?: unknown;
  salaryCurrency?: string | null;
  headcount?: unknown;
  expiresAt?: unknown;
  warnings?: JobImportWarning[];
}): JobImportCandidate {
  const warnings = [...(args.warnings ?? [])];
  const compensation = normalizeCompensation({
    minimum: args.salaryMin,
    maximum: args.salaryMax,
    currency: args.salaryCurrency,
    warnings,
  });
  const headcount = normalizeSalary(args.headcount);
  if (args.headcount != null && headcount == null) {
    warnings.push({
      code: "invalid_headcount",
      field: "headcount",
      message:
        "The source headcount must be a positive whole PostgreSQL-safe number, so it was omitted.",
    });
  }
  const expiresAt = isoDate(args.expiresAt);
  if (args.expiresAt != null && !expiresAt)
    warnings.push({
      code: "invalid_expiry_date",
      field: "expiresAt",
      message: "The source expiration date was invalid, so it was omitted.",
    });

  const job = normalizedJobImportSchema.parse({
    externalId: args.externalId.slice(0, 500),
    sourceUrl: args.sourceUrl,
    sourceUpdatedAt: isoDate(args.sourceUpdatedAt),
    title: titleWithWarning(args.title, warnings),
    description: normalizeDescription(args.description, warnings),
    requirements: normalizeRequirements(args.requirements ?? [], warnings),
    location: args.location ? htmlToPlainText(args.location).slice(0, 200) || null : null,
    workplaceType: normalizeWorkplaceType(args.workplaceType),
    employmentType: normalizeEmploymentType(args.employmentType),
    experienceLevel: normalizeExperienceLevel(args.experienceLevel),
    salaryMin: compensation.salaryMin,
    salaryMax: compensation.salaryMax,
    salaryCurrency: compensation.salaryCurrency,
    headcount,
    expiresAt,
  });

  const finished = finishNormalizedJob(job, warnings);
  return { ...finished, inferredFields: [] };
}

const greenhouseResponseSchema = z.object({ jobs: z.array(z.unknown()) });
const greenhouseJobSchema = z.looseObject({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  content: z.string(),
  absolute_url: z.string().optional(),
  updated_at: z.union([z.string(), z.number()]).optional(),
  application_deadline: z.string().nullable().optional(),
  location: z.object({ name: z.string().optional() }).optional(),
  metadata: z.unknown().optional(),
});

function parseGreenhouse(text: string, fallbackUrl: string): JobImportCandidate[] {
  if (/^\s*</.test(text)) return parseGenericJobPosting(text, fallbackUrl);
  const raw = parseJson(text);
  const response = greenhouseResponseSchema.safeParse(raw);
  const rows = response.success ? response.data.jobs : [raw];
  return rows.slice(0, MAX_JOBS).flatMap((rawJob) => {
    const parsed = greenhouseJobSchema.safeParse(rawJob);
    if (!parsed.success) return [];
    const job = parsed.data;
    if (!htmlToPlainText(job.title) || !htmlToPlainText(job.content)) return [];
    const metadataText = job.metadata == null ? "" : JSON.stringify(job.metadata);
    return [
      candidate({
        platform: "greenhouse",
        externalId: String(job.id),
        sourceUrl: safeUrl(job.absolute_url, fallbackUrl),
        sourceUpdatedAt: job.updated_at,
        title: job.title,
        description: job.content,
        location: job.location?.name ?? null,
        workplaceType: metadataText,
        employmentType: metadataText,
        experienceLevel: metadataText,
        expiresAt: job.application_deadline,
      }),
    ];
  });
}

const leverJobSchema = z.looseObject({
  id: z.string(),
  text: z.string(),
  hostedUrl: z.string().optional(),
  applyUrl: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  workplaceType: z.string().optional(),
  categories: z
    .object({ location: z.string().optional(), commitment: z.string().optional() })
    .optional(),
  descriptionPlain: z.string().optional(),
  description: z.string().optional(),
  additionalPlain: z.string().optional(),
  additional: z.string().optional(),
  lists: z
    .array(z.object({ text: z.string().optional(), content: z.string().optional() }))
    .optional(),
  salaryRange: z
    .object({
      min: z.number().nullable().optional(),
      max: z.number().nullable().optional(),
      currency: z.string().nullable().optional(),
      interval: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

function parseLever(text: string, fallbackUrl: string): JobImportCandidate[] {
  if (/^\s*</.test(text)) return parseGenericJobPosting(text, fallbackUrl);
  const raw = parseJson(text);
  const response = Array.isArray(raw) ? raw : [raw];
  return response.slice(0, MAX_JOBS).flatMap((raw) => {
    const parsed = leverJobSchema.safeParse(raw);
    if (!parsed.success) return [];
    const job = parsed.data;
    const lists = job.lists ?? [];
    const description = [
      job.descriptionPlain ?? job.description ?? "",
      ...lists.map((list) => `${list.text ?? ""}\n${list.content ?? ""}`),
      job.additionalPlain ?? job.additional ?? "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const requirements = lists
      .filter((list) => /require|qualif|skill/i.test(list.text ?? ""))
      .flatMap((list) => htmlToPlainText(list.content ?? "").split("\n"));
    if (!htmlToPlainText(job.text) || !htmlToPlainText(description)) return [];
    const annualSalary =
      !job.salaryRange?.interval || /year|annual/i.test(job.salaryRange.interval);
    const warnings: JobImportWarning[] = [];
    if (!annualSalary && (job.salaryRange?.min || job.salaryRange?.max)) {
      warnings.push({
        code: "unsupported_salary_period",
        field: "salaryMin",
        message: "Only annual compensation is supported, so this source salary was omitted.",
      });
    }
    return [
      candidate({
        platform: "lever",
        externalId: job.id,
        sourceUrl: safeUrl(job.hostedUrl ?? job.applyUrl, fallbackUrl),
        sourceUpdatedAt: job.updatedAt ?? job.createdAt,
        title: job.text,
        description,
        requirements,
        location: job.categories?.location ?? null,
        workplaceType: job.workplaceType,
        employmentType: job.categories?.commitment,
        salaryMin: annualSalary ? job.salaryRange?.min : null,
        salaryMax: annualSalary ? job.salaryRange?.max : null,
        salaryCurrency: job.salaryRange?.currency,
        warnings,
      }),
    ];
  });
}

const ashbyCompensationComponentSchema = z.object({
  compensationType: z.string().optional(),
  interval: z.string().optional(),
  currencyCode: z.string().nullable().optional(),
  minValue: z.number().nullable().optional(),
  maxValue: z.number().nullable().optional(),
});
const ashbyJobSchema = z.looseObject({
  id: z.string().optional(),
  title: z.string(),
  location: z.string().optional(),
  workplaceType: z.string().optional(),
  employmentType: z.string().optional(),
  descriptionPlain: z.string().optional(),
  descriptionHtml: z.string().optional(),
  publishedAt: z.string().optional(),
  jobUrl: z.string(),
  isListed: z.boolean().optional(),
  compensation: z
    .object({ summaryComponents: z.array(ashbyCompensationComponentSchema).optional() })
    .optional(),
});

function parseAshby(text: string, fallbackUrl: string): JobImportCandidate[] {
  if (/^\s*</.test(text)) return parseGenericJobPosting(text, fallbackUrl);
  const response = z.object({ jobs: z.array(z.unknown()) }).parse(parseJson(text));
  return response.jobs.slice(0, MAX_JOBS).flatMap((raw) => {
    const parsed = ashbyJobSchema.safeParse(raw);
    if (!parsed.success || parsed.data.isListed === false) return [];
    const job = parsed.data;
    const description = job.descriptionPlain ?? job.descriptionHtml ?? "";
    if (!htmlToPlainText(job.title) || !htmlToPlainText(description)) return [];
    const salary = job.compensation?.summaryComponents?.find(
      (component) =>
        component.compensationType?.toLowerCase() === "salary" &&
        /year/i.test(component.interval ?? ""),
    );
    const sourceUrl = safeUrl(job.jobUrl, fallbackUrl);
    return [
      candidate({
        platform: "ashby",
        externalId: job.id ?? sourceUrl,
        sourceUrl,
        sourceUpdatedAt: job.publishedAt,
        title: job.title,
        description,
        location: job.location ?? null,
        workplaceType: job.workplaceType,
        employmentType: job.employmentType,
        salaryMin: salary?.minValue,
        salaryMax: salary?.maxValue,
        salaryCurrency: salary?.currencyCode,
      }),
    ];
  });
}

const recruiteeJobSchema = z.looseObject({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  description_requirements: z.string().optional(),
  careers_url: z.string().optional(),
  url: z.string().optional(),
  updated_at: z.string().optional(),
  updated: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  remote: z.boolean().optional(),
  hybrid: z.boolean().optional(),
  on_site: z.boolean().optional(),
  employment_type: z.string().optional(),
  contract_type: z.string().optional(),
  experience: z.string().optional(),
  salary: z
    .object({
      min_salary: z.number().nullable().optional(),
      max_salary: z.number().nullable().optional(),
      period: z.string().nullable().optional(),
      currency: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

function parseRecruitee(text: string, fallbackUrl: string): JobImportCandidate[] {
  if (/^\s*</.test(text)) return parseGenericJobPosting(text, fallbackUrl);
  const raw = parseJson(text);
  const envelope = z.object({ offers: z.array(z.unknown()) }).safeParse(raw);
  const single = z.object({ offer: z.unknown() }).safeParse(raw);
  const rows = envelope.success
    ? envelope.data.offers
    : single.success
      ? [single.data.offer]
      : z.array(z.unknown()).parse(raw);
  return rows.slice(0, MAX_JOBS).flatMap((item) => {
    const parsed = recruiteeJobSchema.safeParse(item);
    if (!parsed.success) return [];
    const job = parsed.data;
    const workplace = job.hybrid ? "hybrid" : job.remote ? "remote" : job.on_site ? "onsite" : null;
    const annualSalary = !job.salary?.period || /year/i.test(job.salary.period);
    const warnings: JobImportWarning[] = [];
    if (!annualSalary && (job.salary?.min_salary || job.salary?.max_salary)) {
      warnings.push({
        code: "unsupported_salary_period",
        field: "salaryMin",
        message: "Only annual compensation is supported, so this source salary was omitted.",
      });
    }
    const description =
      job.description_requirements ??
      [job.description, job.requirements].filter(Boolean).join("\n\n");
    if (!htmlToPlainText(job.title) || !htmlToPlainText(description)) return [];
    return [
      candidate({
        platform: "recruitee",
        externalId: String(job.id),
        sourceUrl: safeUrl(job.careers_url ?? job.url, fallbackUrl),
        sourceUpdatedAt: job.updated_at ?? job.updated,
        title: job.title,
        description,
        requirements: job.requirements ? htmlToPlainText(job.requirements).split("\n") : [],
        location: job.location ?? job.city ?? null,
        workplaceType: workplace,
        employmentType: job.employment_type ?? job.contract_type,
        experienceLevel: job.experience,
        salaryMin: annualSalary ? job.salary?.min_salary : null,
        salaryMax: annualSalary ? job.salary?.max_salary : null,
        salaryCurrency: job.salary?.currency,
        warnings,
      }),
    ];
  });
}

const smartRecruitersJobSchema = z.looseObject({
  id: z.string().optional(),
  uuid: z.string().optional(),
  name: z.string(),
  releasedDate: z.string().optional(),
  postingUrl: z.string().optional(),
  jobAdUrl: z.string().optional(),
  location: z
    .object({
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
      remote: z.boolean().optional(),
    })
    .optional(),
  locationType: z.string().optional(),
  experienceLevel: z.object({ id: z.string().optional(), label: z.string().optional() }).optional(),
  typeOfEmployment: z
    .object({ id: z.string().optional(), label: z.string().optional() })
    .optional(),
  jobAd: z
    .object({
      jobDescription: z.string().optional(),
      qualifications: z.string().optional(),
      additionalInformation: z.string().optional(),
      sections: z
        .object({
          jobDescription: z.object({ text: z.string().optional() }).optional(),
          qualifications: z.object({ text: z.string().optional() }).optional(),
          additionalInformation: z.object({ text: z.string().optional() }).optional(),
        })
        .optional(),
    })
    .optional(),
});

function parseSmartRecruiters(text: string, fallbackUrl: string): JobImportCandidate[] {
  if (/^\s*</.test(text)) return parseGenericJobPosting(text, fallbackUrl);
  const raw = parseJson(text);
  const response = z.object({ content: z.array(z.unknown()) }).safeParse(raw);
  const rows = response.success ? response.data.content : [raw];
  return rows.slice(0, MAX_JOBS).flatMap((rawJob) => {
    const parsed = smartRecruitersJobSchema.safeParse(rawJob);
    if (!parsed.success) return [];
    const job = parsed.data;
    const id = job.uuid ?? job.id;
    if (!id) return [];
    const jobDescription = job.jobAd?.sections?.jobDescription?.text ?? job.jobAd?.jobDescription;
    const qualifications = job.jobAd?.sections?.qualifications?.text ?? job.jobAd?.qualifications;
    const additionalInformation =
      job.jobAd?.sections?.additionalInformation?.text ?? job.jobAd?.additionalInformation;
    const description = [jobDescription, qualifications, additionalInformation]
      .filter(Boolean)
      .join("\n\n");
    if (!htmlToPlainText(job.name) || !htmlToPlainText(description)) return [];
    const location = [job.location?.city, job.location?.region, job.location?.country]
      .filter(Boolean)
      .join(", ");
    return [
      candidate({
        platform: "smartrecruiters",
        externalId: id,
        sourceUrl: safeUrl(job.postingUrl ?? job.jobAdUrl, fallbackUrl),
        sourceUpdatedAt: job.releasedDate,
        title: job.name,
        description,
        requirements: qualifications ? htmlToPlainText(qualifications).split("\n") : [],
        location: location || null,
        workplaceType: job.locationType ?? (job.location?.remote ? "remote" : null),
        employmentType: job.typeOfEmployment?.label ?? job.typeOfEmployment?.id,
        experienceLevel: job.experienceLevel?.label ?? job.experienceLevel?.id,
      }),
    ];
  });
}

const jsonLdObjectSchema = z.record(z.string(), z.unknown());

function collectJsonLdJobs(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(collectJsonLdJobs);
  const parsed = jsonLdObjectSchema.safeParse(value);
  if (!parsed.success) return [];
  const object = parsed.data;
  const type = object["@type"];
  const types = Array.isArray(type) ? type : [type];
  const current = types.includes("JobPosting") ? [object] : [];
  return [...current, ...collectJsonLdJobs(object["@graph"] ?? [])];
}

function jsonLdString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function jsonLdLocation(value: unknown): string | null {
  const values = Array.isArray(value) ? value : [value];
  const locations = values.flatMap((entry) => {
    const place = jsonLdObjectSchema.safeParse(entry);
    if (!place.success) return [];
    const address = jsonLdObjectSchema.safeParse(place.data.address);
    if (!address.success) return [];
    const parts = [
      jsonLdString(address.data.addressLocality),
      jsonLdString(address.data.addressRegion),
      jsonLdString(address.data.addressCountry),
    ].filter((part) => part !== null);
    return parts.length > 0 ? [parts.join(", ")] : [];
  });
  return locations.length > 0 ? locations.join(" · ") : null;
}

function jsonLdSalary(value: unknown): {
  min: number | null;
  max: number | null;
  currency: string | null;
  annual: boolean;
} {
  const monetary = jsonLdObjectSchema.safeParse(value);
  if (!monetary.success) return { min: null, max: null, currency: null, annual: true };
  const nested = jsonLdObjectSchema.safeParse(monetary.data.value);
  const source = nested.success ? nested.data : monetary.data;
  const min = normalizeSalary(source.minValue ?? source.value);
  const max = normalizeSalary(source.maxValue ?? source.value);
  const unit = jsonLdString(source.unitText) ?? "YEAR";
  return {
    min,
    max,
    currency: jsonLdString(monetary.data.currency) ?? jsonLdString(source.currency),
    annual: /year|annual/i.test(unit),
  };
}

function parseGenericJobPosting(html: string, finalUrl: string): JobImportCandidate[] {
  const scripts = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  const jobs = scripts.flatMap((match) => {
    try {
      return collectJsonLdJobs(JSON.parse(match[1]));
    } catch {
      return [];
    }
  });
  if (jobs.length !== 1) {
    throw new ExpectedError(
      "invalid_input",
      jobs.length === 0
        ? "That page does not contain a JobPosting record. Try an individual public job URL."
        : "That page contains multiple jobs. Use an individual job URL or upload a CSV.",
    );
  }

  const job = jobs[0];
  const title = jsonLdString(job.title) ?? jsonLdString(job.name);
  const description = jsonLdString(job.description);
  if (!title || !description) {
    throw new ExpectedError(
      "invalid_input",
      "The JobPosting record is missing a title or description.",
    );
  }
  const salary = jsonLdSalary(job.baseSalary);
  const warnings: JobImportWarning[] = [];
  if (!salary.annual && (salary.min || salary.max)) {
    warnings.push({
      code: "unsupported_salary_period",
      field: "salaryMin",
      message: "Only annual compensation is supported, so this source salary was omitted.",
    });
  }
  const identifierObject = jsonLdObjectSchema.safeParse(job.identifier);
  const identifier =
    jsonLdString(job.identifier) ??
    (identifierObject.success ? jsonLdString(identifierObject.data.value) : null) ??
    finalUrl;
  const employmentType = Array.isArray(job.employmentType)
    ? job.employmentType.find((value) => typeof value === "string")
    : job.employmentType;
  return [
    candidate({
      platform: "generic",
      externalId: identifier,
      sourceUrl: safeUrl(job.url, finalUrl),
      sourceUpdatedAt: job.datePosted,
      title,
      description,
      location: jsonLdLocation(job.jobLocation),
      workplaceType: job.jobLocationType,
      employmentType,
      experienceLevel: job.experienceRequirements,
      salaryMin: salary.annual ? salary.min : null,
      salaryMax: salary.annual ? salary.max : null,
      salaryCurrency: salary.currency,
      headcount: job.totalJobOpenings,
      expiresAt: job.validThrough,
      warnings,
    }),
  ];
}

export function parseJobImportSource(args: {
  platform: Exclude<JobImportSourcePlatform, "csv">;
  text: string;
  finalUrl: string;
}): JobImportCandidate[] {
  let jobs: JobImportCandidate[];
  switch (args.platform) {
    case "greenhouse":
      jobs = parseGreenhouse(args.text, args.finalUrl);
      break;
    case "lever":
      jobs = parseLever(args.text, args.finalUrl);
      break;
    case "ashby":
      jobs = parseAshby(args.text, args.finalUrl);
      break;
    case "recruitee":
      jobs = parseRecruitee(args.text, args.finalUrl);
      break;
    case "smartrecruiters":
      jobs = parseSmartRecruiters(args.text, args.finalUrl);
      break;
    case "generic":
      jobs = parseGenericJobPosting(args.text, args.finalUrl);
      break;
  }

  if (jobs.length === 0) {
    throw new ExpectedError("not_found", "No importable public jobs were found at that source.");
  }
  return jobs;
}
