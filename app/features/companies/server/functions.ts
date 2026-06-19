import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import type { Sql } from "postgres";
import { z } from "zod";
import { countJobsByCompanyAndStatus } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";
import { asSqlTransaction } from "@/shared/db-transaction";
import { companySizeSchema, industrySchema, MAX_COMPANY_DESCRIPTION_LENGTH } from "@/shared/enums";
import { assertCanManageCompanyProfile } from "@/shared/membership-auth";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import { type SessionData, sessionConfig } from "@/shared/session";
import {
  nullableTrimmedString,
  nullableTrimmedUrl,
  optionalTrimmedString,
  optionalTrimmedUrl,
  requiredTrimmedString,
  zodValidatorWithFormattedErrors,
} from "@/shared/validation";
import {
  countTeamSlotsByCompany,
  createCompanyMember,
  getActiveMembershipByUserId,
  getAnyMembershipByUserId,
} from "../queries/membership-queries_sql";
import {
  countCompaniesFiltered,
  createCompany as createCompanyQuery,
  getAllCompaniesPaginated as getAllCompaniesPaginatedQuery,
  getCompanyById,
  getCompanyBySlug as getCompanyBySlugQuery,
  slugExists,
  updateCompanyProfile as updateCompanyProfileQuery,
} from "../queries/queries_sql";

// --- Slug generation ---

const generateBaseSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const generateUniqueSlug = async (name: string): Promise<string> => {
  const db = getDb();
  const base = generateBaseSlug(name);

  const result = await slugExists(db, { slug: base });
  if (!result?.exists) return base;

  // Append random suffix until unique
  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${base}-${suffix}`;
    const check = await slugExists(db, { slug: candidate });
    if (!check?.exists) return candidate;
  }

  // Fallback: timestamp-based
  return `${base}-${Date.now().toString(36)}`;
};

// --- Schemas ---

const createCompanySchema = z.object({
  name: requiredTrimmedString(100, "Company name is required"),
  description: optionalTrimmedString(MAX_COMPANY_DESCRIPTION_LENGTH),
  industry: industrySchema.optional(),
  companySize: companySizeSchema.optional(),
});

const updateCompanyProfileSchema = z.object({
  name: requiredTrimmedString(100, "Company name is required"),
  description: nullableTrimmedString(MAX_COMPANY_DESCRIPTION_LENGTH),
  logoKey: z.string().min(1).nullable(),
  website: nullableTrimmedUrl(),
  industry: industrySchema.nullable(),
  companySize: companySizeSchema.nullable(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  location: nullableTrimmedString(200),
  techStack: z.array(z.string()).nullable(),
  culture: nullableTrimmedString(5000),
  socialLinks: z
    .object({
      linkedin: optionalTrimmedUrl(),
      twitter: optionalTrimmedUrl(),
      github: optionalTrimmedUrl(),
    })
    .nullable(),
});

const allowedLogoTypes = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
} as const;

const maxLogoFileSize = 2 * 1024 * 1024;

const uploadCompanyLogoSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    contentType: z.enum(
      Object.keys(allowedLogoTypes) as [
        keyof typeof allowedLogoTypes,
        ...Array<keyof typeof allowedLogoTypes>,
      ],
      "Unsupported image format. Use PNG, JPG, WEBP, or SVG",
    ),
    fileBase64: z.string().min(1),
  })
  .refine(
    (data) => {
      const approximateBytes = data.fileBase64.length * 0.75;
      return approximateBytes <= maxLogoFileSize;
    },
    {
      message: "Logo must be 2MB or smaller",
      path: ["fileBase64"],
    },
  );

const sanitizeLogoFileName = (fileName: string) => {
  const trimmed = fileName.trim().toLowerCase();
  const lastDotIndex = trimmed.lastIndexOf(".");
  const baseName = lastDotIndex > 0 ? trimmed.slice(0, lastDotIndex) : trimmed;

  return (
    baseName
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "logo"
  );
};

const buildLogoKey = (
  userId: string,
  fileName: string,
  contentType: keyof typeof allowedLogoTypes,
) =>
  `company-logos/${userId}/${crypto.randomUUID()}--${sanitizeLogoFileName(fileName)}.${allowedLogoTypes[contentType]}`;

const assertLogoKeyBelongsToUser = (logoKey: string, userId: string) => {
  if (!logoKey.startsWith(`company-logos/${userId}/`)) {
    throw new Error("Invalid company logo key");
  }
};

export const resolveMyCompanyContext = async (db: Sql, userId: string) => {
  const membership = await getActiveMembershipByUserId(db, { userId });
  if (membership) {
    const company = await getCompanyById(db, { id: membership.companyId });
    if (!company) {
      // Active membership without a company should not happen; treat like removed.
      return { state: "removed" as const };
    }
    return { state: "active" as const, company, membership };
  }

  const anyMembership = await getAnyMembershipByUserId(db, { userId });
  if (anyMembership) {
    return { state: "removed" as const };
  }

  return { state: "new" as const };
};

// --- Server Functions ---

export const createCompany = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(createCompanySchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "company") {
      throw new Error("Only company accounts can create a workspace");
    }

    const existing = await getActiveMembershipByUserId(db, {
      userId: context.userId,
    });
    if (existing) {
      throw new Error("You already belong to a company");
    }

    const priorMembership = await getAnyMembershipByUserId(db, {
      userId: context.userId,
    });
    if (priorMembership) {
      throw new Error(
        "Your account has no active company workspace. Accept an invitation to join a team.",
      );
    }

    const slug = await generateUniqueSlug(data.name);

    const company = await db.begin(async (tx) => {
      const transaction = asSqlTransaction(tx);

      const created = await createCompanyQuery(transaction, {
        ownerId: context.userId,
        name: data.name,
        slug,
        description: data.description ?? null,
        logoKey: null,
        industry: data.industry ?? null,
        companySize: data.companySize ?? null,
      });

      if (!created) {
        throw new Error("Failed to create company");
      }

      await createCompanyMember(transaction, {
        companyId: created.id,
        userId: context.userId,
        role: "owner",
        invitedBy: null,
      });

      return created;
    });

    return { company };
  });

export const getMyCompanyContext = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);
  if (!session.data.userId) {
    return { state: "unauthenticated" as const };
  }
  return resolveMyCompanyContext(getDb(), session.data.userId);
});

/**
 * Single round-trip bootstrap for the `_authenticated` layout: resolves the
 * caller's company context AND the job/team counts needed to derive
 * entitlements. Replaces three separate server-function calls
 * (getMyCompanyContext + getMyJobCounts + getMyTeamCounts), each of which
 * otherwise re-ran auth middleware and re-resolved the company. Because the
 * `_authenticated` beforeLoad re-executes on every preload/navigation, those
 * three calls fanned out into many serialized worker round-trips in production.
 */
export const getMyCompanyBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);
  if (!session.data.userId) {
    return { state: "unauthenticated" as const };
  }

  const db = getDb();
  const context = await resolveMyCompanyContext(db, session.data.userId);
  if (context.state !== "active") {
    return context;
  }

  const [jobCounts, teamCounts] = await Promise.all([
    countJobsByCompanyAndStatus(db, { companyId: context.company.id }),
    countTeamSlotsByCompany(db, { companyId: context.company.id }),
  ]);

  return {
    ...context,
    jobCounts: jobCounts ?? { openCount: 0, draftCount: 0, totalCount: 0 },
    teamCounts,
  };
});

export const getMyCompany = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);
  if (!session.data.userId) {
    return null;
  }
  const context = await resolveMyCompanyContext(getDb(), session.data.userId);
  return context.state === "active" ? context.company : null;
});

export const updateCompanyProfile = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(updateCompanyProfileSchema))
  .handler(async ({ data, context }) => {
    assertCanManageCompanyProfile(context.membership.role);

    const db = getDb();

    if (data.logoKey) {
      assertLogoKeyBelongsToUser(data.logoKey, context.userId);
    }

    const updated = await updateCompanyProfileQuery(db, {
      name: data.name,
      description: data.description,
      logoKey: data.logoKey,
      website: data.website,
      industry: data.industry,
      companySize: data.companySize,
      foundedYear: data.foundedYear,
      location: data.location,
      techStack: data.techStack,
      culture: data.culture,
      socialLinks: data.socialLinks,
      id: context.company.id,
    });

    if (!updated) {
      throw new Error("Failed to update company profile");
    }

    return { company: updated };
  });

export const uploadCompanyLogo = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidatorWithFormattedErrors(uploadCompanyLogoSchema))
  .handler(async ({ data, context }) => {
    assertCanManageCompanyProfile(context.membership.role);

    const logoKey = buildLogoKey(context.userId, data.fileName, data.contentType);
    const bytes = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
    await env.RESUMES.put(logoKey, bytes.buffer, {
      httpMetadata: { contentType: data.contentType },
    });
    return { logoKey };
  });

// --- Public Server Functions ---

const companySlugSchema = z.object({
  slug: z.string().min(1),
});

export const getCompanyBySlug = createServerFn({ method: "GET" })
  .validator(zodValidator(companySlugSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    const company = await getCompanyBySlugQuery(db, { slug: data.slug });
    return company;
  });

const COMPANIES_PER_PAGE = 12;

const paginatedCompaniesSchema = z.object({
  search: z.string(),
  industry: z.string(),
  size: z.string(),
  page: z.number().int().min(1),
});

export const getAllCompaniesPaginated = createServerFn({ method: "GET" })
  .validator(zodValidator(paginatedCompaniesSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    const offset = (data.page - 1) * COMPANIES_PER_PAGE;

    const [items, countRow] = await Promise.all([
      getAllCompaniesPaginatedQuery(db, {
        search: data.search,
        industry: data.industry,
        companySize: data.size,
        limit: COMPANIES_PER_PAGE,
        offset,
      }),
      countCompaniesFiltered(db, {
        search: data.search,
        industry: data.industry,
        companySize: data.size,
      }),
    ]);

    const total = countRow?.total ?? 0;

    return { items, total, totalPages: Math.ceil(total / COMPANIES_PER_PAGE) };
  });
