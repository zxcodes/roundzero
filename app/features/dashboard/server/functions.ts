import { createServerFn } from "@tanstack/react-start";
import {
  countApplicationsByCandidate,
  countApplicationsByCompany,
} from "@/features/applications/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { countJobsByCompanyAndStatus } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    if (!context.user.role) {
      throw new Error("User not found or role not set");
    }

    if (context.user.role === "company") {
      const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
      if (!company) {
        return { type: "company", openRoles: 0, draftJobs: 0, totalJobs: 0, totalApplicants: 0 };
      }

      const [jobCounts, appCounts] = await Promise.all([
        countJobsByCompanyAndStatus(db, { companyId: company.id }),
        countApplicationsByCompany(db, { companyId: company.id }),
      ]);

      return {
        type: "company",
        openRoles: jobCounts?.openCount ?? 0,
        draftJobs: jobCounts?.draftCount ?? 0,
        totalJobs: jobCounts?.totalCount ?? 0,
        totalApplicants: appCounts?.totalCount ?? 0,
      };
    }

    // Candidate
    const counts = await countApplicationsByCandidate(db, { candidateId: context.userId });

    return {
      type: "candidate",
      applicationsSent: counts?.totalCount ?? 0,
      activeApplications: counts?.activeCount ?? 0,
      interviewInvites: counts?.interviewInvitedCount ?? 0,
      evaluationsReceived: counts?.evaluatedCount ?? 0,
    };
  });
