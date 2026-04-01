import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getUserById } from "@/features/auth/queries/queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";
import { createR2ResumeDownloadUrl, createR2ResumeUploadUrl, r2ResumeExists } from "@/shared/r2";
import { sanitizeResumeFileName } from "@/shared/resume";
import { type SessionData, sessionConfig } from "@/shared/session";
import {
  nullableTrimmedString,
  optionalTrimmedString,
  optionalTrimmedUrl,
} from "@/shared/validation";
import {
  createCandidateProfile as createCandidateProfileQuery,
  createCandidateWorkHistoryEntryQuery,
  deleteCandidateWorkHistoryByProfileIdQuery,
  getCandidateProfileByUserId,
  getCandidateWorkHistoryByProfileId,
  updateCandidateProfileQuery,
  type updateCandidateProfileRow,
} from "../queries/queries_sql";

// --- Schemas ---

const createCandidateProfileSchema = z.object({
  headline: optionalTrimmedString(200),
  resumeKey: z.string().min(1).optional(),
});

const updateCandidateProfileSchema = z.object({
  headline: nullableTrimmedString(200),
  resumeKey: z.string().min(1).nullable(),
  bio: nullableTrimmedString(5000),
  skills: z.array(z.string().trim().min(1)).nullable(),
  workHistory: z
    .array(
      z
        .object({
          company: z.string().trim().max(200),
          title: z.string().trim().max(200),
          startMonth: z.string().max(7),
          endMonth: z.string().max(7).nullable(),
          currentlyWorkingHere: z.boolean(),
          description: optionalTrimmedString(1000),
        })
        .superRefine((entry, ctx) => {
          const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
          const hasAnyValue = Boolean(
            entry.company ||
              entry.title ||
              entry.startMonth ||
              entry.endMonth ||
              entry.currentlyWorkingHere ||
              entry.description,
          );

          if (!hasAnyValue) {
            return;
          }

          if (entry.startMonth && !monthSchema.safeParse(entry.startMonth).success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["startMonth"],
              message: "Start month must use YYYY-MM format",
            });
          }

          if (entry.endMonth && !monthSchema.safeParse(entry.endMonth).success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["endMonth"],
              message: "End month must use YYYY-MM format",
            });
          }

          if (entry.startMonth && entry.endMonth && entry.endMonth < entry.startMonth) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["endMonth"],
              message: "End month must be after start month",
            });
          }
        }),
    )
    .nullable(),
  links: z
    .object({
      linkedin: optionalTrimmedUrl(),
      github: optionalTrimmedUrl(),
      portfolio: optionalTrimmedUrl(),
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

const resumeFileNameSchema = z.object({
  resumeKey: z.string().min(1),
  fileName: z.string().min(1).max(255).optional(),
});

const buildResumeKey = (
  userId: string,
  fileName: string,
  contentType: keyof typeof allowedResumeTypes,
) =>
  `resumes/${userId}/${crypto.randomUUID()}--${sanitizeResumeFileName(fileName).replace(/\.[^.]+$/, "")}.${allowedResumeTypes[contentType]}`;

const assertResumeKeyBelongsToUser = (resumeKey: string, userId: string) => {
  if (!resumeKey.startsWith(`resumes/${userId}/`)) {
    throw new Error("Invalid resume key");
  }
};

const buildCandidateProfilePayload = async (db: ReturnType<typeof getDb>, userId: string) => {
  const profile = await getCandidateProfileByUserId(db, { userId });
  if (!profile) {
    return null;
  }

  const workHistory = await getCandidateWorkHistoryByProfileId(db, {
    candidateProfileId: profile.id,
  });

  return {
    ...profile,
    workHistory: workHistory.map((entry) => ({
      company: entry.company,
      title: entry.title,
      startMonth: entry.startMonth,
      endMonth: entry.endMonth,
      currentlyWorkingHere: entry.currentlyWorkingHere,
      description: entry.description ?? undefined,
    })),
  };
};

// --- Server Functions ---

export const createCandidateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(createCandidateProfileSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const existing = await buildCandidateProfilePayload(db, context.userId);
    if (existing) {
      throw new Error("You already have a candidate profile");
    }

    const profile = await createCandidateProfileQuery(db, {
      userId: context.userId,
      headline: data.headline ?? null,
      resumeKey: data.resumeKey ?? null,
    });

    if (!profile) {
      throw new Error("Failed to create candidate profile");
    }

    return {
      profile: {
        ...profile,
        workHistory: [],
      },
    };
  });

export const getMyCandidateProfile = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);

  if (!session.data.userId) {
    return null;
  }

  const db = getDb();
  const profile = await buildCandidateProfilePayload(db, session.data.userId);
  return profile;
});

export const updateMyCandidateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(updateCandidateProfileSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const existing = await buildCandidateProfilePayload(db, context.userId);
    if (!existing) {
      throw new Error("No candidate profile found");
    }

    const sanitizedWorkHistory = (data.workHistory ?? [])
      .map((entry) => ({
        company: entry.company,
        title: entry.title,
        startMonth: entry.startMonth,
        endMonth: entry.currentlyWorkingHere ? null : entry.endMonth,
        currentlyWorkingHere: entry.currentlyWorkingHere,
        description: entry.description,
      }))
      .filter(
        (entry) =>
          entry.company &&
          entry.title &&
          entry.startMonth &&
          (entry.currentlyWorkingHere || entry.endMonth),
      );

    await db.begin(async (tx) => {
      const updatedRows = await tx
        .unsafe(updateCandidateProfileQuery, [
          data.headline,
          data.resumeKey,
          data.bio,
          data.skills,
          data.links,
          context.userId,
        ])
        .values();

      const row = updatedRows[0];
      const updated: updateCandidateProfileRow | undefined = row
        ? {
            id: row[0],
            userId: row[1],
            onboardingCompletedAt: row[2],
            headline: row[3],
            resumeKey: row[4],
            resumeUpdatedAt: row[5],
            bio: row[6],
            skills: row[7],
            links: row[8],
            createdAt: row[9],
            updatedAt: row[10],
          }
        : undefined;

      if (!updated) {
        throw new Error("Failed to update candidate profile");
      }

      await tx.unsafe(deleteCandidateWorkHistoryByProfileIdQuery, [updated.id]);

      for (const [index, entry] of sanitizedWorkHistory.entries()) {
        await tx.unsafe(createCandidateWorkHistoryEntryQuery, [
          updated.id,
          entry.company,
          entry.title,
          entry.startMonth,
          entry.endMonth,
          entry.currentlyWorkingHere,
          entry.description ?? null,
          index,
        ]);
      }
    });

    const profile = await buildCandidateProfilePayload(db, context.userId);
    if (!profile) {
      throw new Error("Failed to load updated candidate profile");
    }

    return { profile };
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
    const resumeKey = buildResumeKey(context.userId, data.fileName, data.contentType);

    return {
      resumeKey,
      uploadUrl: await createR2ResumeUploadUrl({
        resumeKey,
        contentType: data.contentType,
      }),
      uploadMethod: "put" as const,
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
    const exists = await r2ResumeExists(data.resumeKey);
    if (!exists) {
      throw new Error("Uploaded resume could not be found");
    }
    return { resumeKey: data.resumeKey };
  });

export const getResumeDownloadUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(resumeFileNameSchema))
  .handler(async ({ data, context }) => {
    assertResumeKeyBelongsToUser(data.resumeKey, context.userId);
    const url = await createR2ResumeDownloadUrl({
      resumeKey: data.resumeKey,
      fileName: data.fileName,
    });
    return { url };
  });
