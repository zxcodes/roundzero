import { z } from "zod";

export const candidateFactCategorySchema = z.enum([
  "role_family",
  "skill",
  "seniority",
  "domain",
  "responsibility",
  "education",
  "certification",
]);

export const jobFactCategorySchema = z.enum([
  "role_family",
  "required_skill",
  "preferred_skill",
  "seniority",
  "domain",
  "responsibility",
  "education",
  "certification",
]);

const normalizedIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const candidateFactSchema = z
  .object({
    id: normalizedIdSchema,
    category: candidateFactCategorySchema,
    canonicalId: normalizedIdSchema,
    label: z.string().min(1).max(120),
  })
  .strict();

export const jobFactSchema = z
  .object({
    id: normalizedIdSchema,
    category: jobFactCategorySchema,
    canonicalId: normalizedIdSchema,
    label: z.string().min(1).max(120),
  })
  .strict();

export const candidateMatchingProfileSchema = z
  .object({
    recentTitles: z.array(z.string().min(1).max(100)).max(5),
    experienceYearsBucket: z.enum(["unknown", "0-2", "3-5", "6-9", "10+"]),
    facts: z.array(candidateFactSchema).max(60),
  })
  .strict();

export const jobMatchingProfileSchema = z
  .object({
    facts: z.array(jobFactSchema).max(60),
  })
  .strict();

export const rerankerOutputSchema = z
  .object({
    matches: z.array(
      z
        .object({
          jobId: z.string().uuid(),
          score: z.number(),
          evidencePairs: z
            .array(
              z
                .object({
                  candidateFactId: normalizedIdSchema,
                  jobFactId: normalizedIdSchema,
                })
                .strict(),
            )
            .max(3),
        })
        .strict(),
    ),
  })
  .strict();

export const matchReasonSchema = z
  .object({
    candidateFactId: normalizedIdSchema,
    jobFactId: normalizedIdSchema,
    text: z.string().min(1).max(240),
  })
  .strict();

export const matchReasonsSchema = z.array(matchReasonSchema).max(3);

export const matchingStatusSchema = z.enum(["pending", "processing", "ready", "failed"]);

export type CandidateMatchingProfile = z.infer<typeof candidateMatchingProfileSchema>;
export type JobMatchingProfile = z.infer<typeof jobMatchingProfileSchema>;
export type MatchReason = z.infer<typeof matchReasonSchema>;
