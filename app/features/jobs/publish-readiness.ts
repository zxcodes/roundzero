export type JobRecommendedField = "workplaceType" | "employmentType" | "experienceLevel";

export function getMissingRecommendedFields(job: {
  workplaceType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
}): JobRecommendedField[] {
  const missing: JobRecommendedField[] = [];
  if (!job.workplaceType) missing.push("workplaceType");
  if (!job.employmentType) missing.push("employmentType");
  if (!job.experienceLevel) missing.push("experienceLevel");
  return missing;
}

export function getJobPublishBlockReason(
  job: {
    status: string;
    expiresAt: Date | null;
  },
  now = new Date(),
): string | null {
  if (job.status !== "draft") return "Only draft jobs can be published.";
  if (job.expiresAt && job.expiresAt <= now) {
    return "Update the expired deadline before publishing.";
  }
  return null;
}
