import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { claimAndStartCandidateRefresh } from "@/features/job-matching/server/orchestration";
import { getDb } from "@/shared/db";
import { asSqlTransaction } from "@/shared/db-transaction";
import { ExpectedError } from "@/shared/expected-error";
import { authMiddleware } from "@/shared/middleware";
import { isUniqueViolation } from "@/shared/postgres-errors";
import { arrayBufferToBase64, sanitizeResumeFileName } from "@/shared/resume";
import { type SessionData, sessionConfig } from "@/shared/session";
import { zodValidator } from "@/shared/validation";

import {
  createCandidateProfile as createCandidateProfileQuery,
  deleteCandidateJobMatches,
  getCandidateProfileByUserId,
  updateCandidateProfile as updateCandidateProfileQuery,
} from "../queries/queries_sql";

// --- Schemas ---

const createCandidateProfileSchema = z.object({
  resumeKey: z.string().min(1).optional(),
});

const updateCandidateProfileSchema = z.object({
  resumeKey: z.string().min(1).nullable(),
});

const allowedResumeTypes = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

const maxResumeFileSize = 5 * 1024 * 1024;

const uploadResumeSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    contentType: z.enum(
      Object.keys(allowedResumeTypes) as [
        keyof typeof allowedResumeTypes,
        ...Array<keyof typeof allowedResumeTypes>,
      ],
      "Unsupported file format. Use PDF or DOCX",
    ),
    fileBase64: z
      .string()
      .min(1)
      .regex(/^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/, "Invalid file data"),
  })
  .refine(
    (data) => {
      const approximateBytes = data.fileBase64.length * 0.75;
      return approximateBytes <= maxResumeFileSize;
    },
    {
      message: "Resume must be 5MB or smaller",
      path: ["fileBase64"],
    },
  );

const getResumeSchema = z.object({
  resumeKey: z.string().min(1),
});

const buildResumeKey = (
  userId: string,
  fileName: string,
  contentType: keyof typeof allowedResumeTypes,
) =>
  `resumes/${userId}/${crypto.randomUUID()}--${sanitizeResumeFileName(fileName).replace(/\.[^.]+$/, "")}.${allowedResumeTypes[contentType]}`;

const assertResumeKeyBelongsToUser = (resumeKey: string, userId: string) => {
  if (!resumeKey.startsWith(`resumes/${userId}/`)) {
    throw new ExpectedError("forbidden", "Invalid resume key");
  }
};

// --- Server Functions ---

export const createCandidateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(createCandidateProfileSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const existing = await getCandidateProfileByUserId(db, { userId: context.userId });
    if (existing) {
      throw new ExpectedError("already_exists", "You already have a candidate profile");
    }

    let profile;
    try {
      profile = await createCandidateProfileQuery(db, {
        userId: context.userId,
        resumeKey: data.resumeKey ?? null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ExpectedError("already_exists", "You already have a candidate profile");
      }
      throw error;
    }

    if (!profile) {
      throw new Error("Failed to create candidate profile");
    }

    if (profile.resumeKey) {
      await claimAndStartCandidateRefresh({ db, candidateId: context.userId });
    }

    return { profile };
  });

export const getMyCandidateProfile = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);

  if (!session.data.userId) {
    return null;
  }

  const db = getDb();
  return await getCandidateProfileByUserId(db, { userId: session.data.userId });
});

export const updateMyCandidateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(updateCandidateProfileSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const existing = await getCandidateProfileByUserId(db, { userId: context.userId });
    if (!existing) {
      throw new ExpectedError("setup_required", "No candidate profile found");
    }

    const resumeChanged = data.resumeKey !== existing.resumeKey;
    const profile = await db.begin(async (tx) => {
      const transaction = asSqlTransaction(tx);
      const updated = await updateCandidateProfileQuery(transaction, {
        resumeKey: data.resumeKey,
        userId: context.userId,
      });
      if (resumeChanged && data.resumeKey === null) {
        await deleteCandidateJobMatches(transaction, { candidateId: context.userId });
      }
      return updated;
    });

    if (!profile) {
      throw new ExpectedError("conflict", "Candidate profile changed while being updated");
    }

    if (data.resumeKey && resumeChanged) {
      await claimAndStartCandidateRefresh({ db, candidateId: context.userId });
    }

    return { profile };
  });

export const uploadResume = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(uploadResumeSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "candidate") {
      throw new ExpectedError("forbidden", "Only candidates can upload resumes");
    }
    const resumeKey = buildResumeKey(context.userId, data.fileName, data.contentType);
    const bytes = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
    await env.RESUMES.put(resumeKey, bytes.buffer, {
      httpMetadata: { contentType: data.contentType },
    });
    return { resumeKey };
  });

export const getResume = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(getResumeSchema))
  .handler(async ({ data, context }) => {
    assertResumeKeyBelongsToUser(data.resumeKey, context.userId);
    const object = await env.RESUMES.get(data.resumeKey);
    if (!object) {
      throw new Error(`Resume object missing from R2: ${data.resumeKey}`);
    }
    return {
      base64: arrayBufferToBase64(await object.arrayBuffer()),
      contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
    };
  });
