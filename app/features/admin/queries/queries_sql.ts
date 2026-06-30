import { Sql } from "postgres";

export const getPlatformAdminUserMetricsQuery = `-- name: getPlatformAdminUserMetrics :one
SELECT
  count(*) FILTER (WHERE deleted_at IS NULL)::int AS active_users,
  count(*) FILTER (WHERE deleted_at IS NULL AND role = 'company')::int AS company_users,
  count(*) FILTER (WHERE deleted_at IS NULL AND role = 'candidate')::int AS candidate_users,
  count(*) FILTER (WHERE deleted_at IS NULL AND role IS NULL)::int AS unassigned_users,
  count(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS deleted_users,
  count(*) FILTER (WHERE deleted_at IS NULL AND created_at >= now() - interval '7 days')::int AS new_users_7d
FROM users`;

export interface getPlatformAdminUserMetricsRow {
    activeUsers: number;
    companyUsers: number;
    candidateUsers: number;
    unassignedUsers: number;
    deletedUsers: number;
    newUsers_7d: number;
}

export async function getPlatformAdminUserMetrics(sql: Sql): Promise<getPlatformAdminUserMetricsRow | null> {
    const rows = await sql.unsafe(getPlatformAdminUserMetricsQuery, []).values();
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
        newUsers_7d: row[5]
    };
}

export const getPlatformAdminCompanyMetricsQuery = `-- name: getPlatformAdminCompanyMetrics :one
SELECT
  count(*)::int AS companies,
  count(*) FILTER (WHERE onboarding_completed_at IS NOT NULL)::int AS onboarded_companies,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_companies_7d
FROM companies`;

export interface getPlatformAdminCompanyMetricsRow {
    companies: number;
    onboardedCompanies: number;
    newCompanies_7d: number;
}

export async function getPlatformAdminCompanyMetrics(sql: Sql): Promise<getPlatformAdminCompanyMetricsRow | null> {
    const rows = await sql.unsafe(getPlatformAdminCompanyMetricsQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        companies: row[0],
        onboardedCompanies: row[1],
        newCompanies_7d: row[2]
    };
}

export const getPlatformAdminJobMetricsQuery = `-- name: getPlatformAdminJobMetrics :one
SELECT
  count(*) FILTER (WHERE archived_at IS NULL)::int AS active_jobs,
  count(*) FILTER (WHERE archived_at IS NULL AND status = 'open')::int AS open_jobs,
  count(*) FILTER (WHERE archived_at IS NULL AND status = 'draft')::int AS draft_jobs,
  count(*) FILTER (WHERE archived_at IS NULL AND status = 'closed')::int AS closed_jobs,
  count(*) FILTER (WHERE archived_at IS NOT NULL)::int AS archived_jobs
FROM jobs`;

export interface getPlatformAdminJobMetricsRow {
    activeJobs: number;
    openJobs: number;
    draftJobs: number;
    closedJobs: number;
    archivedJobs: number;
}

export async function getPlatformAdminJobMetrics(sql: Sql): Promise<getPlatformAdminJobMetricsRow | null> {
    const rows = await sql.unsafe(getPlatformAdminJobMetricsQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        activeJobs: row[0],
        openJobs: row[1],
        draftJobs: row[2],
        closedJobs: row[3],
        archivedJobs: row[4]
    };
}

export const getPlatformAdminApplicationMetricsQuery = `-- name: getPlatformAdminApplicationMetrics :one
SELECT
  count(*)::int AS applications,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_applications_7d
FROM applications`;

export interface getPlatformAdminApplicationMetricsRow {
    applications: number;
    newApplications_7d: number;
}

export async function getPlatformAdminApplicationMetrics(sql: Sql): Promise<getPlatformAdminApplicationMetricsRow | null> {
    const rows = await sql.unsafe(getPlatformAdminApplicationMetricsQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        applications: row[0],
        newApplications_7d: row[1]
    };
}

export const getPlatformAdminInterviewMetricsQuery = `-- name: getPlatformAdminInterviewMetrics :one
SELECT
  count(*)::int AS interviews,
  count(*) FILTER (WHERE status = 'completed')::int AS interviews_completed,
  count(*) FILTER (WHERE status IN ('pending', 'in_progress', 'awaiting_voice'))::int AS interviews_active,
  count(*) FILTER (WHERE status = 'cancelled')::int AS interviews_cancelled,
  count(*) FILTER (WHERE status = 'expired')::int AS interviews_expired,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_interviews_7d
FROM interviews`;

export interface getPlatformAdminInterviewMetricsRow {
    interviews: number;
    interviewsCompleted: number;
    interviewsActive: number;
    interviewsCancelled: number;
    interviewsExpired: number;
    newInterviews_7d: number;
}

export async function getPlatformAdminInterviewMetrics(sql: Sql): Promise<getPlatformAdminInterviewMetricsRow | null> {
    const rows = await sql.unsafe(getPlatformAdminInterviewMetricsQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        interviews: row[0],
        interviewsCompleted: row[1],
        interviewsActive: row[2],
        interviewsCancelled: row[3],
        interviewsExpired: row[4],
        newInterviews_7d: row[5]
    };
}

export const getPlatformAdminReportMetricsQuery = `-- name: getPlatformAdminReportMetrics :one
SELECT
  count(*)::int AS reports,
  count(*) FILTER (WHERE released_at IS NOT NULL)::int AS reports_released,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_reports_7d
FROM reports`;

export interface getPlatformAdminReportMetricsRow {
    reports: number;
    reportsReleased: number;
    newReports_7d: number;
}

export async function getPlatformAdminReportMetrics(sql: Sql): Promise<getPlatformAdminReportMetricsRow | null> {
    const rows = await sql.unsafe(getPlatformAdminReportMetricsQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        reports: row[0],
        reportsReleased: row[1],
        newReports_7d: row[2]
    };
}

export const getPlatformAdminBatchCountQuery = `-- name: getPlatformAdminBatchCount :one
SELECT count(*)::int AS batches
FROM job_batches`;

export interface getPlatformAdminBatchCountRow {
    batches: number;
}

export async function getPlatformAdminBatchCount(sql: Sql): Promise<getPlatformAdminBatchCountRow | null> {
    const rows = await sql.unsafe(getPlatformAdminBatchCountQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        batches: row[0]
    };
}

export const getPlatformAdminPreEvaluationCountQuery = `-- name: getPlatformAdminPreEvaluationCount :one
SELECT count(*)::int AS pre_evaluations
FROM pre_evaluations`;

export interface getPlatformAdminPreEvaluationCountRow {
    preEvaluations: number;
}

export async function getPlatformAdminPreEvaluationCount(sql: Sql): Promise<getPlatformAdminPreEvaluationCountRow | null> {
    const rows = await sql.unsafe(getPlatformAdminPreEvaluationCountQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        preEvaluations: row[0]
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

