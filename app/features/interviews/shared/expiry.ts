export const getInterviewExpiresAt = (metadata: unknown): Date | null => {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const expiresAtValue = (metadata as Record<string, unknown>).expiresAt;
  if (typeof expiresAtValue !== "string") {
    return null;
  }

  const expiresAt = new Date(expiresAtValue);
  if (Number.isNaN(expiresAt.getTime())) {
    return null;
  }

  return expiresAt;
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
