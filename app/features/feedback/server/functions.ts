import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { getActiveMembershipByUserId } from "@/features/companies/queries/membership-queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";
import { requiredTrimmedString } from "@/shared/validation";

import { createFeedback as createFeedbackQuery } from "../queries/queries_sql";

const createFeedbackSchema = z.object({
  type: z.enum(["bug", "feature", "general"]),
  message: requiredTrimmedString(2000, "Feedback is required"),
});

export const createFeedback = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(createFeedbackSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    let companyId: string | null = null;
    if (context.user.role === "company") {
      const membership = await getActiveMembershipByUserId(db, { userId: context.userId });
      companyId = membership?.companyId ?? null;
    }

    const feedback = await createFeedbackQuery(db, {
      userId: context.userId,
      role: context.user.role ?? "candidate",
      type: data.type,
      message: data.message,
      companyId,
    });

    if (!feedback) {
      throw new Error("Failed to submit feedback");
    }

    return { feedback };
  });
