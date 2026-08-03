export type PublishRequiredField = "workplaceType" | "employmentType" | "experienceLevel";

export const publishRequiredFieldLabels: Record<PublishRequiredField, string> = {
  workplaceType: "workplace type",
  employmentType: "employment type",
  experienceLevel: "seniority",
};

export function getMissingPublishFields(job: {
  workplaceType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
}): PublishRequiredField[] {
  const missing: PublishRequiredField[] = [];
  if (!job.workplaceType) missing.push("workplaceType");
  if (!job.employmentType) missing.push("employmentType");
  if (!job.experienceLevel) missing.push("experienceLevel");
  return missing;
}

export function missingPublishFieldsMessage(fields: PublishRequiredField[]): string {
  return fields.map((field) => publishRequiredFieldLabels[field]).join(", ");
}

export function getJobPublishBlockReason(
  job: {
    status: string;
    workplaceType: string | null;
    employmentType: string | null;
    experienceLevel: string | null;
    expiresAt: Date | null;
  },
  now = new Date(),
): string | null {
  if (job.status !== "draft") return "Only draft jobs can be published.";

  const missingFields = getMissingPublishFields(job);
  if (missingFields.length > 0) {
    return `Complete the ${missingPublishFieldsMessage(missingFields)} before publishing.`;
  }
  if (job.expiresAt && job.expiresAt <= now) {
    return "Update the expired deadline before publishing.";
  }
  return null;
}
