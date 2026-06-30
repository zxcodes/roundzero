import { Sql } from "postgres";

export const getPlatformAdminMetricsQuery = `-- name: getPlatformAdminMetrics :one
SELECT
  (SELECT count(*)::int FROM users WHERE deleted_at IS NULL) AS active_users,
  (SELECT count(*)::int FROM users WHERE deleted_at IS NULL AND role = 'company') AS company_users,
  (SELECT count(*)::int FROM users WHERE deleted_at IS NULL AND role = 'candidate') AS candidate_users,
  (SELECT count(*)::int FROM users WHERE deleted_at IS NULL AND role IS NULL) AS unassigned_users,
  (SELECT count(*)::int FROM users WHERE deleted_at IS NOT NULL) AS deleted_users,
  (SELECT count(*)::int FROM companies) AS companies,
  (SELECT count(*)::int FROM companies WHERE onboarding_completed_at IS NOT NULL) AS onboarded_companies,
  (SELECT count(*)::int FROM jobs WHERE archived_at IS NULL) AS active_jobs,
  (SELECT count(*)::int FROM jobs WHERE archived_at IS NULL AND status = 'open') AS open_jobs,
  (SELECT count(*)::int FROM jobs WHERE archived_at IS NULL AND status = 'draft') AS draft_jobs,
  (SELECT count(*)::int FROM jobs WHERE archived_at IS NULL AND status = 'closed') AS closed_jobs,
  (SELECT count(*)::int FROM jobs WHERE archived_at IS NOT NULL) AS archived_jobs,
  (SELECT count(*)::int FROM applications) AS applications,
  (SELECT count(*)::int FROM interviews) AS interviews,
  (SELECT count(*)::int FROM interviews WHERE status = 'completed') AS interviews_completed,
  (SELECT count(*)::int FROM interviews WHERE status IN ('pending', 'in_progress', 'awaiting_voice')) AS interviews_active,
  (SELECT count(*)::int FROM interviews WHERE status = 'cancelled') AS interviews_cancelled,
  (SELECT count(*)::int FROM interviews WHERE status = 'expired') AS interviews_expired,
  (SELECT count(*)::int FROM reports) AS reports,
  (SELECT count(*)::int FROM reports WHERE released_at IS NOT NULL) AS reports_released,
  (SELECT count(*)::int FROM job_batches) AS batches,
  (SELECT count(*)::int FROM pre_evaluations) AS pre_evaluations,
  (SELECT count(*)::int FROM users WHERE deleted_at IS NULL AND created_at >= now() - interval '7 days') AS new_users_7d,
  (SELECT count(*)::int FROM companies WHERE created_at >= now() - interval '7 days') AS new_companies_7d,
  (SELECT count(*)::int FROM applications WHERE created_at >= now() - interval '7 days') AS new_applications_7d,
  (SELECT count(*)::int FROM interviews WHERE created_at >= now() - interval '7 days') AS new_interviews_7d,
  (SELECT count(*)::int FROM reports WHERE created_at >= now() - interval '7 days') AS new_reports_7d`;

export interface getPlatformAdminMetricsRow {
    activeUsers: number;
    companyUsers: number;
    candidateUsers: number;
    unassignedUsers: number;
    deletedUsers: number;
    companies: number;
    onboardedCompanies: number;
    activeJobs: number;
    openJobs: number;
    draftJobs: number;
    closedJobs: number;
    archivedJobs: number;
    applications: number;
    interviews: number;
    interviewsCompleted: number;
    interviewsActive: number;
    interviewsCancelled: number;
    interviewsExpired: number;
    reports: number;
    reportsReleased: number;
    batches: number;
    preEvaluations: number;
    newUsers_7d: number;
    newCompanies_7d: number;
    newApplications_7d: number;
    newInterviews_7d: number;
    newReports_7d: number;
}

export async function getPlatformAdminMetrics(sql: Sql): Promise<getPlatformAdminMetricsRow | null> {
    const rows = await sql.unsafe(getPlatformAdminMetricsQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        activeUsers: row[0],
        companyUsers: row[1],
        candidateUsers: row[2],
        unassignedUsers: row[3],
        deletedUsers: row[4],
        companies: row[5],
        onboardedCompanies: row[6],
        activeJobs: row[7],
        openJobs: row[8],
        draftJobs: row[9],
        closedJobs: row[10],
        archivedJobs: row[11],
        applications: row[12],
        interviews: row[13],
        interviewsCompleted: row[14],
        interviewsActive: row[15],
        interviewsCancelled: row[16],
        interviewsExpired: row[17],
        reports: row[18],
        reportsReleased: row[19],
        batches: row[20],
        preEvaluations: row[21],
        newUsers_7d: row[22],
        newCompanies_7d: row[23],
        newApplications_7d: row[24],
        newInterviews_7d: row[25],
        newReports_7d: row[26]
    };
}

export const getPlatformAdminCompanyPlansQuery = `-- name: getPlatformAdminCompanyPlans :one
SELECT
  count(*) FILTER (WHERE subscription_plan = 'free')::int AS plan_free,
  count(*) FILTER (WHERE subscription_plan = 'starter')::int AS plan_starter,
  count(*) FILTER (WHERE subscription_plan = 'growth')::int AS plan_growth,
  count(*) FILTER (WHERE subscription_plan = 'scale')::int AS plan_scale,
  count(*)::int AS total
FROM companies`;

export interface getPlatformAdminCompanyPlansRow {
    planFree: number;
    planStarter: number;
    planGrowth: number;
    planScale: number;
    total: number;
}

export async function getPlatformAdminCompanyPlans(sql: Sql): Promise<getPlatformAdminCompanyPlansRow | null> {
    const rows = await sql.unsafe(getPlatformAdminCompanyPlansQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        planFree: row[0],
        planStarter: row[1],
        planGrowth: row[2],
        planScale: row[3],
        total: row[4]
    };
}

export const getPlatformAdminApplicationStatusesQuery = `-- name: getPlatformAdminApplicationStatuses :one
SELECT
  count(*) FILTER (WHERE status = 'applied')::int AS applied,
  count(*) FILTER (WHERE status = 'pre_screening')::int AS pre_screening,
  count(*) FILTER (WHERE status = 'queued_for_batch')::int AS queued_for_batch,
  count(*) FILTER (WHERE status = 'interview_invited')::int AS interview_invited,
  count(*) FILTER (WHERE status = 'interview_in_progress')::int AS interview_in_progress,
  count(*) FILTER (WHERE status = 'evaluated_held')::int AS evaluated_held,
  count(*) FILTER (WHERE status = 'evaluated')::int AS evaluated,
  count(*) FILTER (WHERE status = 'shortlisted')::int AS shortlisted,
  count(*) FILTER (WHERE status = 'rejected')::int AS rejected,
  count(*) FILTER (WHERE status = 'withdrawn')::int AS withdrawn,
  count(*) FILTER (WHERE status = 'evaluation_failed')::int AS evaluation_failed,
  count(*)::int AS total
FROM applications`;

export interface getPlatformAdminApplicationStatusesRow {
    applied: number;
    preScreening: number;
    queuedForBatch: number;
    interviewInvited: number;
    interviewInProgress: number;
    evaluatedHeld: number;
    evaluated: number;
    shortlisted: number;
    rejected: number;
    withdrawn: number;
    evaluationFailed: number;
    total: number;
}

export async function getPlatformAdminApplicationStatuses(sql: Sql): Promise<getPlatformAdminApplicationStatusesRow | null> {
    const rows = await sql.unsafe(getPlatformAdminApplicationStatusesQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        applied: row[0],
        preScreening: row[1],
        queuedForBatch: row[2],
        interviewInvited: row[3],
        interviewInProgress: row[4],
        evaluatedHeld: row[5],
        evaluated: row[6],
        shortlisted: row[7],
        rejected: row[8],
        withdrawn: row[9],
        evaluationFailed: row[10],
        total: row[11]
    };
}

