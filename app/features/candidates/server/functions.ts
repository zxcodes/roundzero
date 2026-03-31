import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getUserById } from "@/features/auth/queries/queries_sql";
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
  resumeKey: z.string().min(1),
});

const updateCandidateProfileSchema = z.object({
  headline: z.string().max(200).nullable(),
  resumeKey: z.string().min(1).nullable(),
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

const allowedResumeTypes = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

const maxResumeFileSize = 5 * 1024 * 1024;

const resumeUploadTargetSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(maxResumeFileSize),
  contentType: z.enum(
    Object.keys(allowedResumeTypes) as [
      keyof typeof allowedResumeTypes,
      ...Array<keyof typeof allowedResumeTypes>,
    ],
  ),
});

const finalizeResumeUploadSchema = z.object({
  resumeKey: z.string().min(1),
});

const buildResumeKey = (userId: string, contentType: keyof typeof allowedResumeTypes) =>
  `resumes/${userId}/${crypto.randomUUID()}.${allowedResumeTypes[contentType]}`;

const assertResumeKeyBelongsToUser = (resumeKey: string, userId: string) => {
  if (!resumeKey.startsWith(`resumes/${userId}/`)) {
    throw new Error("Invalid resume key");
  }
};

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
      resumeKey: data.resumeKey,
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
      resumeKey: data.resumeKey,
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

export const createResumeUploadTarget = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(resumeUploadTargetSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    const user = await getUserById(db, { id: context.userId });
    if (!user || user.role !== "candidate") {
      throw new Error("Only candidates can upload resumes");
    }

    return {
      resumeKey: buildResumeKey(context.userId, data.contentType),
      uploadUrl: null as string | null,
      uploadMethod: "mock" as const,
      maxBytes: maxResumeFileSize,
    };
  });

export const finalizeResumeUpload = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(finalizeResumeUploadSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    const user = await getUserById(db, { id: context.userId });
    if (!user || user.role !== "candidate") {
      throw new Error("Only candidates can finalize resume uploads");
    }
    assertResumeKeyBelongsToUser(data.resumeKey, context.userId);
    return { resumeKey: data.resumeKey };
  });

export const getResumeDownloadUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(finalizeResumeUploadSchema))
  .handler(async ({ data, context }) => {
    assertResumeKeyBelongsToUser(data.resumeKey, context.userId);
    return { url: null as string | null };
  });
