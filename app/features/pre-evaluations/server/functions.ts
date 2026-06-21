import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getApplicationReviewById } from "@/features/applications/queries/queries_sql";
import { getCompanyByMemberUserId } from "@/features/companies/queries/membership-queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";
import { getPreEvaluationByApplicationId } from "../queries/queries_sql";

const getPreEvaluationSchema = z.object({
  applicationId: z.string().uuid(),
});

export const getPreEvaluationForApplication = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(getPreEvaluationSchema))
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
      return getPreEvaluationByApplicationId(db, { applicationId: data.applicationId });
    }

    if (context.user.role === "company") {
      const [company, preEvaluation] = await Promise.all([
        getCompanyByMemberUserId(db, { userId: context.userId }),
        getPreEvaluationByApplicationId(db, { applicationId: data.applicationId }),
      ]);
      if (!company || company.id !== application.companyId) {
        throw new Error("Not authorized to view this pre-evaluation");
      }
      return preEvaluation;
    }

    throw new Error("Not authorized to view this pre-evaluation");
  });
