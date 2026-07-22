export const DEFAULT_META_TITLE = "RoundZero | Review Candidates, Not Resumes";

export const DEFAULT_META_DESCRIPTION =
  "RoundZero automatically interviews and evaluates applicants, delivering ranked candidates, structured reports, and evidence-backed recommendations before the first human interview.";

export const OG_DESCRIPTION =
  "Every applicant gets evaluated. You review ranked candidates with structured reports and clear hiring recommendations.";

export const TWITTER_DESCRIPTION =
  "Stop screening resumes. Review ranked candidates backed by real evaluation.";

export const HOMEPAGE_META_DESCRIPTION =
  "RoundZero helps teams evaluate applicants with evidence-backed interviews and helps candidates discover ranked job matches based on their experience.";

export const NOINDEX_ROBOTS = "noindex, nofollow";

export const PAGE_SEO = {
  jobs: {
    title: "Jobs | RoundZero",
    description:
      "Discover opportunities from companies using RoundZero to evaluate candidates based on experience, reasoning, and communication.",
  },
  apply: {
    title: "Apply | RoundZero",
    description:
      "Apply for jobs and demonstrate your experience through structured evaluation instead of relying solely on your resume.",
  },
  dashboard: {
    title: "Dashboard | RoundZero",
    description:
      "Review ranked candidates, evaluation reports, and hiring recommendations from a single dashboard.",
  },
  createJob: {
    title: "Create Job | RoundZero",
    description:
      "Create a role and start receiving evaluated candidates with structured reports and rankings.",
  },
  candidateReport: {
    title: "Candidate Report | RoundZero",
    description:
      "Review evidence-backed candidate evaluations, interview insights, strengths, concerns, and hiring recommendations.",
  },
  pricing: {
    title: "Pricing | RoundZero",
    description:
      "Flexible pricing for teams that want to evaluate applicants automatically and review ranked candidates instead of screening resumes manually.",
  },
  signIn: {
    title: "Sign In | RoundZero",
    description: "Access your RoundZero workspace.",
  },
  signUp: {
    title: "Create Account | RoundZero",
    description: "Start evaluating applicants and reviewing ranked candidates.",
  },
  companies: {
    title: "Browse Companies | RoundZero",
    description:
      "Explore companies hiring on RoundZero. Find the right culture, stack, and role for you.",
  },
} as const;

export const EMAIL_PREVIEW = {
  welcome: "Welcome to RoundZero. Start reviewing candidates instead of resumes.",
  interviewInvitation: "You've been invited to complete an evaluation for your application.",
  candidateReportReady: "A new candidate report is ready for review.",
} as const;

type JsonLdScript = { type: "application/ld+json"; children: string };

type PageHeadOptions = {
  title: string;
  description: string;
  path: string;
  ogDescription?: string;
  twitterDescription?: string;
  robots?: string;
  scripts?: JsonLdScript[];
};

export function appUrl(): string {
  return import.meta.env.VITE_APP_URL;
}

export function publicJobUrl(jobId: string): string {
  return `${appUrl()}/jobs/${jobId}`;
}

export function truncateDescription(text: string, maxLength = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildPageHead(options: PageHeadOptions) {
  const canonicalUrl = `${appUrl()}${options.path}`;
  const ogDescription = options.ogDescription ?? options.description;
  const twitterDescription = options.twitterDescription ?? ogDescription;

  const meta: Array<Record<string, string>> = [
    { title: options.title },
    { name: "description", content: options.description },
    { property: "og:title", content: options.title },
    { property: "og:description", content: ogDescription },
    { property: "og:url", content: canonicalUrl },
    { name: "twitter:title", content: options.title },
    { name: "twitter:description", content: twitterDescription },
  ];

  if (options.robots) {
    meta.push({ name: "robots", content: options.robots });
  }

  return {
    meta,
    links: [{ rel: "canonical" as const, href: canonicalUrl }],
    scripts: options.scripts,
  };
}

export function noindexHead() {
  return {
    meta: [{ name: "robots", content: NOINDEX_ROBOTS }],
  };
}

const employmentTypeToSchema = (type: string): string => {
  const map: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
  };
  return map[type] ?? "OTHER";
};

export type JobPostingSchemaInput = {
  id: string;
  title: string;
  description: string;
  companyName: string;
  companySlug: string;
  createdAt: Date | string;
  employmentType: string | null;
  location: string | null;
  workplaceType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  expiresAt: Date | string | null;
  requirements: unknown;
};

export function buildJobPageSeo(job: JobPostingSchemaInput) {
  const locationLabel = job.workplaceType === "remote" ? "Remote" : (job.location ?? null);
  const locationSuffix = locationLabel ? ` in ${locationLabel}` : "";
  const title = `${job.title} at ${job.companyName} | RoundZero`;
  const description = truncateDescription(
    `${job.title} at ${job.companyName}${locationSuffix}. ${job.description}`,
  );

  return { title, description };
}

export function buildJobPostingSchema(job: JobPostingSchemaInput): Record<string, unknown> {
  const jobUrl = publicJobUrl(job.id);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    url: jobUrl,
    identifier: {
      "@type": "PropertyValue",
      name: "RoundZero",
      value: job.id,
    },
    directApply: true,
    hiringOrganization: {
      "@type": "Organization",
      name: job.companyName,
      url: `${appUrl()}/companies/${job.companySlug}`,
    },
    datePosted: typeof job.createdAt === "string" ? job.createdAt : job.createdAt.toISOString(),
  };

  if (job.employmentType) {
    schema.employmentType = employmentTypeToSchema(job.employmentType);
  }

  if (job.workplaceType === "remote") {
    schema.jobLocationType = "TELECOMMUTE";
  } else if (job.location) {
    schema.jobLocation = {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.location },
    };
  }

  if (job.salaryMin || job.salaryMax) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salaryCurrency,
      value:
        job.salaryMin && job.salaryMax
          ? { "@type": "QuantitativeValue", minValue: job.salaryMin, maxValue: job.salaryMax }
          : { "@type": "QuantitativeValue", value: job.salaryMin ?? job.salaryMax },
    };
  }

  if (job.expiresAt) {
    schema.validThrough =
      typeof job.expiresAt === "string" ? job.expiresAt : job.expiresAt.toISOString();
  }

  if (Array.isArray(job.requirements) && job.requirements.length > 0) {
    schema.skills = job.requirements;
  }

  return schema;
}

export function jobPostingJsonLd(job: JobPostingSchemaInput): JsonLdScript {
  return {
    type: "application/ld+json",
    children: JSON.stringify(buildJobPostingSchema(job)),
  };
}

export type OrganizationSchemaInput = {
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  foundedYear: number | null;
  logoUrl?: string | null;
};

export function buildOrganizationSchema(company: OrganizationSchemaInput): Record<string, unknown> {
  const profileUrl = `${appUrl()}/companies/${company.slug}`;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: company.website ?? profileUrl,
  };

  if (company.description) {
    schema.description = company.description;
  }
  if (company.website) {
    schema.sameAs = company.website;
  }
  if (company.industry) {
    schema.industry = company.industry;
  }
  if (company.foundedYear) {
    schema.foundingDate = String(company.foundedYear);
  }
  if (company.logoUrl) {
    schema.logo = company.logoUrl;
  }

  return schema;
}

export function organizationJsonLd(company: OrganizationSchemaInput): JsonLdScript {
  return {
    type: "application/ld+json",
    children: JSON.stringify(buildOrganizationSchema(company)),
  };
}

export const SITE_ICON_LINKS = [
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
  { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/manifest.json" },
] as const;
