import { z } from "zod";

export const platformRequestSchema = z.object({
  platform: z.string().trim().min(1, "Platform name is required").max(100),
  careersUrl: z
    .string()
    .trim()
    .max(2_000)
    .refine((value) => !value || z.url().safeParse(value).success, "Enter a valid URL"),
  notes: z.string().trim().max(1_000),
});

export function platformRequestFeedbackMessage(value: z.infer<typeof platformRequestSchema>) {
  return [
    "Job import platform request",
    `Platform: ${value.platform.trim()}`,
    `Example careers URL: ${value.careersUrl.trim() || "Not provided"}`,
    `Notes: ${value.notes.trim() || "Not provided"}`,
  ].join("\n");
}
