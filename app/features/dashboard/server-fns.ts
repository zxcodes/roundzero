import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import {
  countApplicationsByCandidate,
  countApplicationsByCompany,
} from "@/features/applications/queries/queries_sql";
import { getUserById } from "@/features/auth/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { countJobsByCompanyAndStatus } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";

type SessionData = {
  userId: string;
};

const sessionConfig = {
  password: process.env.SESSION_SECRET!,
  name: "hirely-session",
  maxAge: 60 * 60 * 24 * 30,
};

const requireAuth = async () => {
  const session = await useSession<SessionData>(sessionConfig);
  if (!session.data.userId) {
    throw new Error("Not authenticated");
  }
  return session.data.userId;
};

export type CompanyMetrics = {
  type: "company";
  openRoles: number;
  draftJobs: number;
  totalJobs: number;
  totalApplicants: number;
};

export type CandidateMetrics = {
  type: "candidate";
  applicationsSent: number;
  activeApplications: number;
  interviewInvites: number;
  evaluationsReceived: number;
};

export type DashboardMetrics = CompanyMetrics | CandidateMetrics;

export const getDashboardMetrics = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardMetrics> => {
    const userId = await requireAuth();
    const db = getDb();

    const user = await getUserById(db, { id: userId });
    if (!user?.role) {
      throw new Error("User not found or role not set");
    }

    if (user.role === "company") {
      const company = await getCompanyByOwnerId(db, { ownerId: userId });
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
    const counts = await countApplicationsByCandidate(db, { candidateId: userId });

    return {
      type: "candidate",
      applicationsSent: counts?.totalCount ?? 0,
      activeApplications: counts?.activeCount ?? 0,
      interviewInvites: counts?.interviewingCount ?? 0,
      evaluationsReceived: counts?.evaluatedCount ?? 0,
    };
  },
);
