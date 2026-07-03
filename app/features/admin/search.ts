import { z } from "zod";

export const adminFeedbackSearchDefaults = { page: 1 } as const;

export const adminFeedbackSearchSchema = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .default(adminFeedbackSearchDefaults.page)
    .catch(adminFeedbackSearchDefaults.page),
});
