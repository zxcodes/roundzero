import { renderHtml } from "@tanstack/markdown";

import { markdownToPlainText } from "@/features/jobs/markdown";
import { getPublicAssetUrl } from "@/shared/r2";

export const DEFAULT_META_TITLE = "AI Candidate Screening & First-Round Interviews | RoundZero";

export const DEFAULT_META_DESCRIPTION =
  "RoundZero automatically interviews and evaluates applicants, delivering ranked candidates, structured reports, and evidence-backed recommendations before the first human interview.";

export const OG_DESCRIPTION =
  "Every applicant gets evaluated. You review ranked candidates with structured reports and clear hiring recommendations.";

export const TWITTER_DESCRIPTION =
  "Stop screening resumes. Review ranked candidates backed by real evaluation.";

export const HOMEPAGE_META_DESCRIPTION =
  "Screen every applicant with adaptive, asynchronous AI interviews and review evidence-backed candidate reports before the first human interview.";

export const NOINDEX_ROBOTS = "noindex, nofollow, noarchive";
export const NOINDEX_FOLLOW_ROBOTS = "noindex, follow, noarchive";

export const PAGE_SEO = {
  jobs: {
    title: "Browse Open Jobs | RoundZero",
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

function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

type PageHeadOptions = {
  title: string;
  description: string;
  path: string;
  ogDescription?: string;
  twitterDescription?: string;
  robots?: string;
  ogType?: "website" | "article";
  imageUrl?: string;
  imageAlt?: string;
  scripts?: JsonLdScript[];
};

export function appUrl(): string {
  return import.meta.env.VITE_APP_URL.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  return `${appUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function publicJobUrl(jobId: string): string {
  return absoluteUrl(`/jobs/${jobId}`);
}

export function truncateDescription(text: string, maxLength = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildPageHead(options: PageHeadOptions) {
  const canonicalUrl = absoluteUrl(options.path);
  const ogDescription = options.ogDescription ?? options.description;
  const twitterDescription = options.twitterDescription ?? ogDescription;
  const imageUrl = options.imageUrl ?? absoluteUrl("/og-default.png");
  const imageAlt = options.imageAlt ?? "RoundZero — review candidates, not resumes";

  const meta: Array<Record<string, string>> = [
    { title: options.title },
    { name: "description", content: options.description },
    { property: "og:title", content: options.title },
    { property: "og:description", content: ogDescription },
    { property: "og:url", content: canonicalUrl },
    { property: "og:type", content: options.ogType ?? "website" },
    { property: "og:site_name", content: "RoundZero" },
    { property: "og:locale", content: "en_US" },
    { property: "og:image", content: imageUrl },
    { property: "og:image:secure_url", content: imageUrl },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: options.title },
    { name: "twitter:description", content: twitterDescription },
    { name: "twitter:image", content: imageUrl },
    { name: "twitter:image:alt", content: imageAlt },
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

export type HomepageFaq = {
  question: string;
  answer: string;
};

export function buildHomepageSchema(faq: HomepageFaq[]): Record<string, unknown> {
  const siteUrl = absoluteUrl("/");
  const organizationId = `${siteUrl}#organization`;
  const websiteId = `${siteUrl}#website`;
  const applicationId = `${siteUrl}#software`;
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: "RoundZero",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/android-chrome-512x512.png"),
        width: 512,
        height: 512,
      },
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: "RoundZero",
      url: siteUrl,
      publisher: { "@id": organizationId },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": applicationId,
      name: "RoundZero",
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Recruiting Software",
      operatingSystem: "Web",
      description: DEFAULT_META_DESCRIPTION,
      provider: { "@id": organizationId },
    },
  ];

  if (faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${siteUrl}#faq`,
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export function homepageJsonLd(faq: HomepageFaq[]): JsonLdScript {
  return {
    type: "application/ld+json",
    children: serializeJsonLd(buildHomepageSchema(faq)),
  };
}

export type ComparisonPageSchemaInput = {
  title: string;
  description: string;
  items: Array<{ name: string; url: string }>;
};

export function buildComparisonPageSchema(
  comparison: ComparisonPageSchemaInput,
): Record<string, unknown> {
  const pageUrl = absoluteUrl("/compare");
  const pageId = `${pageUrl}#webpage`;
  const itemListId = `${pageUrl}#platforms`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageId,
        name: comparison.title,
        description: comparison.description,
        url: pageUrl,
        isPartOf: { "@id": `${absoluteUrl("/")}#website` },
        breadcrumb: { "@id": breadcrumbId },
        mainEntity: { "@id": itemListId },
        inLanguage: "en",
      },
      {
        "@type": "ItemList",
        "@id": itemListId,
        name: "Hiring platforms compared",
        numberOfItems: comparison.items.length,
        itemListElement: comparison.items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "SoftwareApplication",
            name: item.name,
            url: item.url,
            applicationCategory: "BusinessApplication",
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Compare",
            item: pageUrl,
          },
        ],
      },
    ],
  };
}

export function comparisonPageJsonLd(comparison: ComparisonPageSchemaInput): JsonLdScript {
  return {
    type: "application/ld+json",
    children: serializeJsonLd(buildComparisonPageSchema(comparison)),
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

const US_STATE_CODES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]);

const COUNTRY_ALIASES: Record<string, string> = {
  US: "US",
  USA: "US",
  "UNITED STATES": "US",
  "UNITED STATES OF AMERICA": "US",
  UK: "GB",
  GB: "GB",
  "UNITED KINGDOM": "GB",
  UAE: "AE",
  "UNITED ARAB EMIRATES": "AE",
  AUSTRALIA: "AU",
  AUSTRIA: "AT",
  BELGIUM: "BE",
  BRAZIL: "BR",
  CANADA: "CA",
  CZECHIA: "CZ",
  "CZECH REPUBLIC": "CZ",
  DENMARK: "DK",
  FINLAND: "FI",
  FRANCE: "FR",
  GERMANY: "DE",
  INDIA: "IN",
  IRELAND: "IE",
  ITALY: "IT",
  JAPAN: "JP",
  MEXICO: "MX",
  NETHERLANDS: "NL",
  "NEW ZEALAND": "NZ",
  NORWAY: "NO",
  POLAND: "PL",
  PORTUGAL: "PT",
  ROMANIA: "RO",
  SINGAPORE: "SG",
  "SOUTH AFRICA": "ZA",
  SPAIN: "ES",
  SWEDEN: "SE",
  SWITZERLAND: "CH",
};

function normalizedCountry(value: string): string | null {
  return COUNTRY_ALIASES[value.trim().toUpperCase()] ?? null;
}

function buildJobLocationProperties(job: JobPostingSchemaInput): Record<string, unknown> | null {
  const location = job.location?.trim();
  if (!location) {
    return null;
  }

  if (job.workplaceType === "remote") {
    const restriction = location.match(/^remote\s*(?:[-–—:]|\()\s*([^)]+)\)?$/i)?.[1];
    const country = restriction ? normalizedCountry(restriction) : null;
    if (!country) {
      return null;
    }
    return {
      jobLocationType: "TELECOMMUTE",
      applicantLocationRequirements: { "@type": "Country", name: country },
    };
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const finalPart = parts.at(-1);
  if (!finalPart) {
    return null;
  }

  const upperFinalPart = finalPart.toUpperCase();
  if (parts.length > 1 && US_STATE_CODES.has(upperFinalPart)) {
    return {
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: parts.slice(0, -1).join(", "),
          addressRegion: upperFinalPart,
          addressCountry: "US",
        },
      },
    };
  }

  const country = normalizedCountry(finalPart);
  if (!country) {
    return null;
  }
  const locality = parts.slice(0, -1).join(", ");
  return {
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(locality ? { addressLocality: locality } : {}),
        addressCountry: country,
      },
    },
  };
}

function buildJobPostingDescription(job: JobPostingSchemaInput): string {
  return renderHtml(job.description);
}

export type JobPostingSchemaInput = {
  id: string;
  title: string;
  description: string;
  companyName: string;
  companySlug: string;
  companyLogoKey?: string | null;
  createdAt: Date | string;
  employmentType: string | null;
  location: string | null;
  workplaceType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  expiresAt: Date | string | null;
};

export function buildJobPageSeo(job: JobPostingSchemaInput) {
  const locationLabel = job.workplaceType === "remote" ? "Remote" : (job.location ?? null);
  const locationSuffix = locationLabel ? ` in ${locationLabel}` : "";
  const title = `${job.title} at ${job.companyName} | RoundZero`;
  const description = truncateDescription(
    `${job.title} at ${job.companyName}${locationSuffix}. ${markdownToPlainText(job.description)}`,
  );

  return { title, description };
}

export function buildJobPostingSchema(job: JobPostingSchemaInput): Record<string, unknown> | null {
  const locationProperties = buildJobLocationProperties(job);
  if (!locationProperties) {
    return null;
  }

  const jobUrl = publicJobUrl(job.id);
  const companyLogoUrl = job.companyLogoKey ? getPublicAssetUrl(job.companyLogoKey) : null;
  const hiringOrganization: Record<string, unknown> = {
    "@type": "Organization",
    name: job.companyName,
    url: `${appUrl()}/companies/${job.companySlug}`,
  };
  if (companyLogoUrl) {
    hiringOrganization.logo = companyLogoUrl;
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: buildJobPostingDescription(job),
    url: jobUrl,
    identifier: {
      "@type": "PropertyValue",
      name: "RoundZero",
      value: job.id,
    },
    directApply: true,
    hiringOrganization,
    datePosted: typeof job.createdAt === "string" ? job.createdAt : job.createdAt.toISOString(),
    ...locationProperties,
  };

  if (job.employmentType) {
    schema.employmentType = employmentTypeToSchema(job.employmentType);
  }

  if (job.salaryMin || job.salaryMax) {
    const salaryValue =
      job.salaryMin && job.salaryMax
        ? { "@type": "QuantitativeValue", minValue: job.salaryMin, maxValue: job.salaryMax }
        : { "@type": "QuantitativeValue", value: job.salaryMin ?? job.salaryMax };

    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salaryCurrency,
      value: { ...salaryValue, unitText: "YEAR" },
    };
  }

  if (job.expiresAt) {
    schema.validThrough =
      typeof job.expiresAt === "string" ? job.expiresAt : job.expiresAt.toISOString();
  }

  return schema;
}

export function jobPostingJsonLd(job: JobPostingSchemaInput): JsonLdScript | null {
  const schema = buildJobPostingSchema(job);
  if (!schema) {
    return null;
  }
  return {
    type: "application/ld+json",
    children: serializeJsonLd(schema),
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
  const profileUrl = absoluteUrl(`/companies/${company.slug}`);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${profileUrl}#organization`,
    name: company.name,
    url: profileUrl,
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
    children: serializeJsonLd(buildOrganizationSchema(company)),
  };
}

export type BreadcrumbSchemaItem = {
  name: string;
  path: string;
};

export function buildBreadcrumbSchema(items: BreadcrumbSchemaItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function breadcrumbJsonLd(items: BreadcrumbSchemaItem[]): JsonLdScript {
  return {
    type: "application/ld+json",
    children: serializeJsonLd(buildBreadcrumbSchema(items)),
  };
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const SITE_ICON_LINKS = [
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
  { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/manifest.json" },
] as const;
