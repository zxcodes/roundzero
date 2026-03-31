import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";
import { type SessionData, sessionConfig } from "@/shared/session";
import {
  createCandidateProfile as createCandidateProfileQuery,
  getCandidateProfileByUserId,
  updateCandidateProfile as updateCandidateProfileQuery,
} from "../queries/queries_sql";

// --- Schemas ---

const createCandidateProfileSchema = z.object({
  headline: z.string().max(200).optional(),
  resumeUrl: z.string().url(),
});

const updateCandidateProfileSchema = z.object({
  headline: z.string().max(200).nullable(),
  resumeUrl: z.string().url().nullable(),
  bio: z.string().max(5000).nullable(),
  skills: z.array(z.string()).nullable(),
  workHistory: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .nullable(),
  links: z
    .object({
      linkedin: z.string().url().optional(),
      github: z.string().url().optional(),
      portfolio: z.string().url().optional(),
    })
    .nullable(),
});
export type UpdateCandidateProfileInput = z.infer<typeof updateCandidateProfileSchema>;

// --- Server Functions ---

export const createCandidateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(createCandidateProfileSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const existing = await getCandidateProfileByUserId(db, {
      userId: context.userId,
    });
    if (existing) {
      throw new Error("You already have a candidate profile");
    }

    const profile = await createCandidateProfileQuery(db, {
      userId: context.userId,
      headline: data.headline ?? null,
      resumeUrl: data.resumeUrl ?? null,
    });

    if (!profile) {
      throw new Error("Failed to create candidate profile");
    }

    return { profile };
  });

export const getMyCandidateProfile = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);

  if (!session.data.userId) {
    return null;
  }

  const db = getDb();
  const profile = await getCandidateProfileByUserId(db, {
    userId: session.data.userId,
  });
  return profile;
});

export const updateMyCandidateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(updateCandidateProfileSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const existing = await getCandidateProfileByUserId(db, {
      userId: context.userId,
    });
    if (!existing) {
      throw new Error("No candidate profile found");
    }

    const updated = await updateCandidateProfileQuery(db, {
      headline: data.headline,
      resumeUrl: data.resumeUrl,
      bio: data.bio,
      skills: data.skills,
      workHistory: data.workHistory,
      links: data.links,
      userId: context.userId,
    });

    if (!updated) {
      throw new Error("Failed to update candidate profile");
    }

    return { profile: updated };
  });
