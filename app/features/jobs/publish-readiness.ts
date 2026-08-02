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
