import { z } from "zod";

import { subscriptionPlanSchema } from "./config";

export const billingPageSearchSchema = z.object({
  status: z.enum(["success", "cancelled"]).optional(),
  checkout_id: z.string().optional(),
  plan: subscriptionPlanSchema.optional().catch(undefined),
});
