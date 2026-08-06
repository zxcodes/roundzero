import { z } from "zod";

const itemIdSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const conciseLabelSchema = z.string().trim().min(2).max(110);
const conciseContextSchema = z.string().trim().min(2).max(240);

export const functionalFamilySchema = z.enum([
  "software_engineering",
  "data_ai",
  "product_design",
  "product_management",
  "sales_gtm",
  "customer_success",
  "marketing",
  "operations",
  "finance_accounting",
  "people",
  "legal_compliance",
  "healthcare",
  "education",
  "other",
]);

const profileItemSchema = z
  .object({ id: itemIdSchema, label: conciseLabelSchema, context: conciseContextSchema })
  .strict();
const technologyItemSchema = profileItemSchema
  .extend({
    proficiency: z.enum(["exposure", "working", "advanced", "expert", "unknown"]),
  })
  .strict();
const profileItemGenerationSchema = z
  .object({ id: z.string(), label: z.string(), context: z.string() })
  .strict();
const technologyItemGenerationSchema = profileItemGenerationSchema
  .extend({
    proficiency: z.enum(["exposure", "working", "advanced", "expert", "unknown"]),
  })
  .strict();

export const candidateMatchingProfileSchema = z
  .object({
    summary: z.string().trim().min(20).max(600),
    roleIdentities: z
      .array(z.object({ id: itemIdSchema, label: conciseLabelSchema }).strict())
      .min(1)
      .max(6),
    experienceYearsBucket: z.enum(["unknown", "0-2", "3-5", "6-9", "10+"]),
    seniority: z.enum([
      "entry",
      "mid",
      "senior",
      "lead",
      "staff_principal",
      "executive",
      "unknown",
    ]),
    primaryFunctionalFamily: functionalFamilySchema,
    adjacentFunctionalFamilies: z.array(functionalFamilySchema).max(4),
    capabilities: z.array(profileItemSchema).min(1).max(30),
    technologies: z.array(technologyItemSchema).max(30),
    domains: z.array(profileItemSchema).max(12),
  })
  .strict();

export const candidateMatchingProfileGenerationSchema = z
  .object({
    summary: z.string(),
    roleIdentities: z.array(z.object({ id: z.string(), label: z.string() }).strict()),
    experienceYearsBucket: z.enum(["unknown", "0-2", "3-5", "6-9", "10+"]),
    seniority: z.enum([
      "entry",
      "mid",
      "senior",
      "lead",
      "staff_principal",
      "executive",
      "unknown",
    ]),
    primaryFunctionalFamily: functionalFamilySchema,
    adjacentFunctionalFamilies: z.array(functionalFamilySchema),
    capabilities: z.array(profileItemGenerationSchema),
    technologies: z.array(technologyItemGenerationSchema),
    domains: z.array(profileItemGenerationSchema),
  })
  .strict();

export const jobMatchingProfileSchema = z
  .object({
    roleIdentity: z
      .object({
        id: itemIdSchema,
        label: conciseLabelSchema,
        summary: z.string().trim().min(10).max(500),
      })
      .strict(),
    functionalFamilies: z.array(functionalFamilySchema).min(1).max(3),
    seniority: z.enum([
      "entry",
      "mid",
      "senior",
      "lead",
      "staff_principal",
      "executive",
      "unknown",
    ]),
    responsibilities: z.array(profileItemSchema).min(1).max(30),
    requiredCapabilities: z.array(profileItemSchema).min(1).max(30),
    preferredCapabilities: z.array(profileItemSchema).max(20),
    requiredTechnologies: z.array(profileItemSchema).max(25),
    preferredTechnologies: z.array(profileItemSchema).max(20),
    domains: z.array(profileItemSchema).max(12),
  })
  .strict();

export const jobMatchingProfileGenerationSchema = z
  .object({
    roleIdentity: z.object({ id: z.string(), label: z.string(), summary: z.string() }).strict(),
    functionalFamilies: z.array(functionalFamilySchema),
    seniority: z.enum([
      "entry",
      "mid",
      "senior",
      "lead",
      "staff_principal",
      "executive",
      "unknown",
    ]),
    responsibilities: z.array(profileItemGenerationSchema),
    requiredCapabilities: z.array(profileItemGenerationSchema),
    preferredCapabilities: z.array(profileItemGenerationSchema),
    requiredTechnologies: z.array(profileItemGenerationSchema),
    preferredTechnologies: z.array(profileItemGenerationSchema),
    domains: z.array(profileItemGenerationSchema),
  })
  .strict();

export const matchDimensionsSchema = z
  .object({
    roleFunction: z.number(),
    capabilitiesResponsibilities: z.number(),
    technologies: z.number(),
    seniority: z.number(),
    domain: z.number(),
  })
  .strict();

export const rerankerOutputSchema = z
  .object({
    matches: z.array(
      z
        .object({
          jobId: z.string().uuid(),
          score: z.number(),
          dimensions: matchDimensionsSchema,
          evidencePairs: z
            .array(z.object({ candidateItemId: itemIdSchema, jobItemId: itemIdSchema }).strict())
            .max(3),
        })
        .strict(),
    ),
  })
  .strict();

const matchDimensionsGenerationSchema = z
  .object({
    roleFunction: z.number(),
    capabilitiesResponsibilities: z.number(),
    technologies: z.number(),
    seniority: z.number(),
    domain: z.number(),
  })
  .strict();

export function createRerankerOutputGenerationSchema(jobReferences: readonly string[]) {
  if (jobReferences.length === 0) {
    throw new Error("Cannot create a reranker schema without job references");
  }

  return z
    .object({
      matches: z.array(
        z
          .object({
            jobId: z.enum(jobReferences),
            score: z.number(),
            dimensions: matchDimensionsGenerationSchema,
            evidencePairs: z.array(
              z.object({ candidateItemId: z.string(), jobItemId: z.string() }).strict(),
            ),
          })
          .strict(),
      ),
    })
    .strict();
}

export const matchReasonSchema = z
  .object({
    candidateFactId: itemIdSchema,
    jobFactId: itemIdSchema,
    text: z.string().min(1).max(240),
  })
  .strict();
export const matchReasonsSchema = z.array(matchReasonSchema).max(3);
export const matchingStatusSchema = z.enum(["pending", "processing", "ready", "failed"]);
export const matchRefreshPhaseSchema = z.enum([
  "queued",
  "reading_resume",
  "finding_jobs",
  "ranking_matches",
  "updating_feed",
]);

export type CandidateMatchingProfile = z.infer<typeof candidateMatchingProfileSchema>;
export type CandidateMatchingProfileGeneration = z.infer<
  typeof candidateMatchingProfileGenerationSchema
>;
export type JobMatchingProfile = z.infer<typeof jobMatchingProfileSchema>;
export type JobMatchingProfileGeneration = z.infer<typeof jobMatchingProfileGenerationSchema>;
export type MatchReason = z.infer<typeof matchReasonSchema>;
export type MatchRefreshPhase = z.infer<typeof matchRefreshPhaseSchema>;
