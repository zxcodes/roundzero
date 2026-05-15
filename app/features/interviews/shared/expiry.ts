import { z } from "zod";

const metadataSchema = z.object({ expiresAt: z.string().optional() });

export const getInterviewExpiresAt = (metadata: unknown): Date | null => {
  const parsed = metadataSchema.safeParse(metadata);
  if (!parsed.success) return null;
  if (!parsed.data.expiresAt) return null;
  const expiresAt = new Date(parsed.data.expiresAt);
  return Number.isNaN(expiresAt.getTime()) ? null : expiresAt;
};

export const shouldAutoExpireInterview = (status: string, metadata: unknown): boolean => {
  if (status !== "pending" && status !== "in_progress") {
    return false;
  }

  const expiresAt = getInterviewExpiresAt(metadata);
  if (!expiresAt) {
    return false;
  }

  return expiresAt.getTime() <= Date.now();
};
