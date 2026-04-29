import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getApplicationReviewById } from "@/features/applications/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";
import { getPreEvaluationByApplicationId } from "../queries/queries_sql";

const getPreEvaluationSchema = z.object({
  applicationId: z.string().uuid(),
});

export const getPreEvaluationForApplication = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(getPreEvaluationSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const application = await getApplicationReviewById(db, { id: data.applicationId });
    if (!application) {
      return null;
    }

    if (context.user.role === "candidate") {
      if (application.candidateId !== context.userId) {
        throw new Error("Not authorized to view this pre-evaluation");
      }
    }

    if (context.user.role === "company") {
      const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
      if (!company || company.id !== application.companyId) {
        throw new Error("Not authorized to view this pre-evaluation");
      }
    }

    if (context.user.role !== "candidate" && context.user.role !== "company") {
      throw new Error("Not authorized to view this pre-evaluation");
    }

    return getPreEvaluationByApplicationId(db, { applicationId: data.applicationId });
  });
