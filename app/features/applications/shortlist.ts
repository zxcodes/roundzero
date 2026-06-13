import { z } from "zod";

/** Max length of the optional note a company attaches when shortlisting. */
export const MAX_SHORTLIST_NOTE_LENGTH = 1000;

/**
 * Shape persisted at `applications.metadata.shortlist`. Written when a company
 * shortlists an applicant and editable afterward. The note is optional —
 * a company can shortlist with no note at all.
 */
export const shortlistDetailsSchema = z.object({
  note: z.string().max(MAX_SHORTLIST_NOTE_LENGTH).nullable(),
  updatedAt: z.string(),
});

/** Shared validation for the shortlist mutation payload. */
export const shortlistInputSchema = z.object({
  applicationId: z.string().uuid(),
  note: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? null : value),
    z.string().trim().max(MAX_SHORTLIST_NOTE_LENGTH).nullish(),
  ),
  notify: z.boolean().optional(),
});

export type ShortlistDetails = z.infer<typeof shortlistDetailsSchema>;

/** Reads `metadata.shortlist` off a raw application metadata JSONB value. */
export const parseShortlistDetails = (metadata: unknown): ShortlistDetails | null => {
  if (typeof metadata !== "object" || metadata === null) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).shortlist;
  const parsed = shortlistDetailsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

/** True when the shortlist carries a note for the candidate. */
export const hasShortlistNextSteps = (details: ShortlistDetails | null): boolean =>
  details !== null && Boolean(details.note);
