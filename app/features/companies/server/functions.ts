import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getDb } from "@/shared/db";
import { companySizeSchema, industrySchema } from "@/shared/enums";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import { type SessionData, sessionConfig } from "@/shared/session";
import {
  createCompany as createCompanyQuery,
  getAllCompanies as getAllCompaniesQuery,
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
  name: z.string().min(1, "Company name is required").max(100),
  description: z.string().max(500).optional(),
  industry: industrySchema.optional(),
  companySize: companySizeSchema.optional(),
});

const updateCompanyProfileSchema = z.object({
  name: z.string().min(1, "Company name is required").max(100),
  description: z.string().max(2000).nullable(),
  logoUrl: z.string().url().nullable(),
  website: z.string().url().nullable(),
  industry: industrySchema.nullable(),
  companySize: companySizeSchema.nullable(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  location: z.string().max(200).nullable(),
  techStack: z.array(z.string()).nullable(),
  culture: z.string().max(5000).nullable(),
  socialLinks: z
    .object({
      linkedin: z.string().url().optional(),
      twitter: z.string().url().optional(),
      github: z.string().url().optional(),
    })
    .nullable(),
});

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

    const updated = await updateCompanyProfileQuery(db, {
      name: data.name,
      description: data.description,
      logoUrl: data.logoUrl,
      website: data.website,
      industry: data.industry,
      companySize: data.companySize,
      foundedYear: data.foundedYear,
      location: data.location,
      techStack: data.techStack ? JSON.stringify(data.techStack) : null,
      culture: data.culture,
      socialLinks: data.socialLinks ? JSON.stringify(data.socialLinks) : null,
      id: context.company.id,
      ownerId: context.userId,
    });

    if (!updated) {
      throw new Error("Failed to update company profile");
    }

    return { company: updated };
  });

// --- Public Server Functions ---

export const getAllCompanies = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  return getAllCompaniesQuery(db);
});

const companySlugSchema = z.object({
  slug: z.string().min(1),
});

export const getCompanyBySlug = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(companySlugSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    const company = await getCompanyBySlugQuery(db, { slug: data.slug });
    if (!company) {
      throw new Error("Company not found");
    }
    return company;
  });
