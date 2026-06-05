/**
 * Coerce the candidate-facing `expires_at` value (an ISO string projected from
 * interviews.metadata, or a Date) into a Date, returning null when absent or
 * unparseable.
 */
export const toExpiresAtDate = (expiresAt: Date | string | null | undefined): Date | null => {
  if (!expiresAt) return null;
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const shouldAutoExpireInterview = (
  status: string,
  expiresAt: Date | string | null | undefined,
): boolean => {
  if (status !== "pending" && status !== "in_progress") {
    return false;
  }

  const date = toExpiresAtDate(expiresAt);
  if (!date) {
    return false;
  }

  return date.getTime() <= Date.now();
};
