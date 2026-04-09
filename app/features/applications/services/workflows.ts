import type { Sql } from "postgres";
import { getUserById } from "@/features/auth/queries/queries_sql";
import {
  getCandidateProfileByUserId,
  getCandidateWorkHistoryByProfileId,
} from "@/features/candidates/queries/queries_sql";
import { getCompanyById, getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { closeExpiredJobsQuery, getJobById } from "@/features/jobs/queries/queries_sql";
import { notificationPayloadSchemas } from "@/features/notifications/config";
import { createNotification } from "@/features/notifications/queries/queries_sql";
import { type ApplicationStatus, applicationStatusSchema, isValidTransition } from "@/shared/enums";
import {
  createApplication as createApplicationQuery,
  getApplicationById,
  getApplicationByJobAndCandidate,
  updateApplicationStatus as updateApplicationStatusQuery,
} from "../queries/queries_sql";

export const applyToJobWorkflow = async (
  db: Sql,
  input: {
    userId: string;
    jobId: string;
  },
) => {
  await db.unsafe(closeExpiredJobsQuery);

  const user = await getUserById(db, { id: input.userId });
  if (!user || user.role !== "candidate") {
    throw new Error("Only candidates can apply to jobs");
  }

  const job = await getJobById(db, { id: input.jobId });
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.status !== "open") {
    throw new Error("This job is not accepting applications");
  }
  if (job.expiresAt && job.expiresAt <= new Date()) {
    throw new Error("This job has expired and is no longer accepting applications");
  }

  const existing = await getApplicationByJobAndCandidate(db, {
    jobId: input.jobId,
    candidateId: input.userId,
  });
  if (existing) {
    throw new Error("You have already applied to this job");
  }

  const profile = await getCandidateProfileByUserId(db, { userId: input.userId });
  if (!profile?.resumeKey) {
    throw new Error("Add your resume to your profile before applying");
  }

  const workHistory = await getCandidateWorkHistoryByProfileId(db, {
    candidateProfileId: profile.id,
  });

  const application = await createApplicationQuery(db, {
    jobId: input.jobId,
    candidateId: input.userId,
    resumeKey: profile.resumeKey,
    metadata: {
      headline: profile.headline,
      bio: profile.bio,
      skills: profile.skills,
      workHistory: workHistory.map((entry) => ({
        company: entry.company,
        title: entry.title,
        startMonth: entry.startMonth,
        endMonth: entry.endMonth,
        currentlyWorkingHere: entry.currentlyWorkingHere,
        description: entry.description,
      })),
      links: profile.links,
    },
    status: "applied",
  });

  if (!application) {
    throw new Error("Failed to submit application");
  }

  const company = await getCompanyById(db, { id: job.companyId });
  if (company) {
    const payload = notificationPayloadSchemas.new_applicant.parse({
      applicationId: application.id,
      jobId: job.id,
      jobTitle: job.title,
      candidateName: user.name,
    });

    await createNotification(db, {
      userId: company.ownerId,
      type: "new_applicant",
      payload,
    });
  }

  return { application };
};

export const updateApplicationStatusWorkflow = async (
  db: Sql,
  input: {
    userId: string;
    applicationId: string;
    status: ApplicationStatus;
  },
) => {
  const application = await getApplicationById(db, {
    id: input.applicationId,
  });
  if (!application) {
    throw new Error("Application not found");
  }

  const company = await getCompanyByOwnerId(db, { ownerId: input.userId });
  if (!company) {
    throw new Error("Not authorized");
  }

  const job = await getJobById(db, { id: application.jobId });
  if (!job || job.companyId !== company.id) {
    throw new Error("Not authorized");
  }

  const currentStatus = applicationStatusSchema.parse(application.status);
  if (!isValidTransition(currentStatus, input.status)) {
    throw new Error(`Cannot transition from "${currentStatus}" to "${input.status}"`);
  }

  const updated = await updateApplicationStatusQuery(db, {
    status: input.status,
    id: input.applicationId,
  });

  if (!updated) {
    throw new Error("Failed to update application status");
  }

  if (currentStatus !== input.status) {
    const payload = notificationPayloadSchemas.application_status_changed.parse({
      applicationId: application.id,
      jobId: application.jobId,
      jobTitle: application.jobTitle,
      companyName: application.companyName,
      status: input.status,
    });

    await createNotification(db, {
      userId: application.candidateId,
      type: "application_status_changed",
      payload,
    });
  }

  return { application: updated };
};
