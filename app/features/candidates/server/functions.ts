import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";
import { arrayBufferToBase64, sanitizeResumeFileName } from "@/shared/resume";
import { type SessionData, sessionConfig } from "@/shared/session";
import { zodValidatorWithFormattedErrors } from "@/shared/validation";

import {
  createCandidateProfile as createCandidateProfileQuery,
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
    fileBase64: z.string().min(1),
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
    throw new Error("Invalid resume key");
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
      throw new Error("You already have a candidate profile");
    }

    const profile = await createCandidateProfileQuery(db, {
      userId: context.userId,
      resumeKey: data.resumeKey ?? null,
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
  return await getCandidateProfileByUserId(db, { userId: session.data.userId });
});

export const updateMyCandidateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(updateCandidateProfileSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const existing = await getCandidateProfileByUserId(db, { userId: context.userId });
    if (!existing) {
      throw new Error("No candidate profile found");
    }

    const profile = await updateCandidateProfileQuery(db, {
      resumeKey: data.resumeKey,
      userId: context.userId,
    });

    if (!profile) {
      throw new Error("Failed to update candidate profile");
    }

    return { profile };
  });

export const uploadResume = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidatorWithFormattedErrors(uploadResumeSchema))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can upload resumes");
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
      throw new Error("Resume not found");
    }
    return {
      base64: arrayBufferToBase64(await object.arrayBuffer()),
      contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
    };
  });
