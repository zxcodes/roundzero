import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getDb } from "@/shared/db";
import { companySizeSchema, industrySchema, MAX_COMPANY_DESCRIPTION_LENGTH } from "@/shared/enums";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import { createR2UploadUrl, r2ObjectExists } from "@/shared/r2.server";
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
  countCompaniesFiltered,
  createCompany as createCompanyQuery,
  getAllCompaniesPaginated as getAllCompaniesPaginatedQuery,
  getCompanyByOwnerId,
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

const logoUploadTargetSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(maxLogoFileSize, "Logo must be 2MB or smaller"),
  contentType: z.enum(
    Object.keys(allowedLogoTypes) as [
      keyof typeof allowedLogoTypes,
      ...Array<keyof typeof allowedLogoTypes>,
    ],
    "Unsupported image format. Use PNG, JPG, WEBP, or SVG",
  ),
});

const finalizeLogoUploadSchema = z.object({
  logoKey: z.string().min(1),
});

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

// --- Server Functions ---

export const createCompany = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(createCompanySchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const existing = await getCompanyByOwnerId(db, {
      ownerId: context.userId,
    });
    if (existing) {
      throw new Error("You already have a company");
    }

    const slug = await generateUniqueSlug(data.name);

    const company = await createCompanyQuery(db, {
      ownerId: context.userId,
      name: data.name,
      slug,
      description: data.description ?? null,
      logoKey: null,
      industry: data.industry ?? null,
      companySize: data.companySize ?? null,
    });

    if (!company) {
      throw new Error("Failed to create company");
    }

    return { company };
  });

export const getMyCompany = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);

  if (!session.data.userId) {
    return null;
  }

  const db = getDb();
  const company = await getCompanyByOwnerId(db, {
    ownerId: session.data.userId,
  });
  return company;
});

export const updateCompanyProfile = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator(zodValidator(updateCompanyProfileSchema))
  .handler(async ({ data, context }) => {
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
      ownerId: context.userId,
    });

    if (!updated) {
      throw new Error("Failed to update company profile");
    }

    return { company: updated };
  });

export const createCompanyLogoUploadTarget = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidatorWithFormattedErrors(logoUploadTargetSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "company") {
      throw new Error("Only company users can upload logos");
    }

    const logoKey = buildLogoKey(context.userId, data.fileName, data.contentType);

    return {
      logoKey,
      uploadUrl: await createR2UploadUrl({
        data: { objectKey: logoKey, contentType: data.contentType },
      }),
      uploadMethod: "put" as const,
      maxBytes: maxLogoFileSize,
    };
  });

export const finalizeCompanyLogoUpload = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(finalizeLogoUploadSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "company") {
      throw new Error("Only company users can finalize logo uploads");
    }

    assertLogoKeyBelongsToUser(data.logoKey, context.userId);
    const exists = await r2ObjectExists({ data: { key: data.logoKey } });
    if (!exists) {
      throw new Error("Uploaded logo could not be found");
    }

    return { logoKey: data.logoKey };
  });

// --- Public Server Functions ---

const companySlugSchema = z.object({
  slug: z.string().min(1),
});

export const getCompanyBySlug = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(companySlugSchema))
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
  .inputValidator(zodValidator(paginatedCompaniesSchema))
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
