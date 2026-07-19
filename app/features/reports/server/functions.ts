import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { getApplicationReviewById } from "@/features/applications/queries/queries_sql";
import { getDb } from "@/shared/db";
import { companyMiddleware } from "@/shared/middleware";

import { loadApplicantReportTimeline } from "./timeline";

const applicationIdSchema = z.object({
  applicationId: z.string().uuid(),
});

export const getCompanyApplicantReportTimeline = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .validator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const application = await getApplicationReviewById(db, { id: data.applicationId });
    if (!application) {
      return null;
    }

    if (application.companyId !== context.company.id) {
      throw new Error("Not authorized to view this applicant");
    }

    return await loadApplicantReportTimeline(db, application);
  });
