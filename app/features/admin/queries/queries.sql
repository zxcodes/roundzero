-- name: getPlatformAdminUserMetrics :one
SELECT
  count(*) FILTER (WHERE deleted_at IS NULL)::int AS active_users,
  count(*) FILTER (WHERE deleted_at IS NULL AND role = 'company')::int AS company_users,
  count(*) FILTER (WHERE deleted_at IS NULL AND role = 'candidate')::int AS candidate_users,
  count(*) FILTER (WHERE deleted_at IS NULL AND role IS NULL)::int AS unassigned_users,
  count(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS deleted_users,
  count(*) FILTER (WHERE deleted_at IS NULL AND created_at >= now() - interval '7 days')::int AS new_users_7d
FROM users;

-- name: getPlatformAdminCompanyMetrics :one
SELECT
  count(*)::int AS companies,
  count(*) FILTER (WHERE onboarding_completed_at IS NOT NULL)::int AS onboarded_companies,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_companies_7d
FROM companies;

-- name: getPlatformAdminJobMetrics :one
SELECT
  count(*) FILTER (WHERE archived_at IS NULL)::int AS active_jobs,
  count(*) FILTER (WHERE archived_at IS NULL AND status = 'open')::int AS open_jobs,
  count(*) FILTER (WHERE archived_at IS NULL AND status = 'draft')::int AS draft_jobs,
  count(*) FILTER (WHERE archived_at IS NULL AND status = 'closed')::int AS closed_jobs,
  count(*) FILTER (WHERE archived_at IS NOT NULL)::int AS archived_jobs
FROM jobs;

-- name: getPlatformAdminApplicationMetrics :one
SELECT
  count(*)::int AS applications,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_applications_7d
FROM applications;

-- name: getPlatformAdminInterviewMetrics :one
SELECT
  count(*)::int AS interviews,
  count(*) FILTER (WHERE status = 'completed')::int AS interviews_completed,
  count(*) FILTER (WHERE status IN ('pending', 'in_progress', 'awaiting_voice'))::int AS interviews_active,
  count(*) FILTER (WHERE status = 'cancelled')::int AS interviews_cancelled,
  count(*) FILTER (WHERE status = 'expired')::int AS interviews_expired,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_interviews_7d
FROM interviews;

-- name: getPlatformAdminReportMetrics :one
SELECT
  count(*)::int AS reports,
  count(*) FILTER (WHERE released_at IS NOT NULL)::int AS reports_released,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_reports_7d
FROM reports;

-- name: getPlatformAdminBatchCount :one
SELECT count(*)::int AS batches
FROM job_batches;

-- name: getPlatformAdminPreEvaluationCount :one
SELECT count(*)::int AS pre_evaluations
FROM pre_evaluations;

-- name: getPlatformAdminCompanyPlans :one
SELECT
  count(*) FILTER (WHERE subscription_plan = 'free')::int AS plan_free,
  count(*) FILTER (WHERE subscription_plan = 'starter')::int AS plan_starter,
  count(*) FILTER (WHERE subscription_plan = 'growth')::int AS plan_growth,
  count(*) FILTER (WHERE subscription_plan = 'scale')::int AS plan_scale,
  count(*)::int AS total
FROM companies;

-- name: getPlatformAdminApplicationStatuses :one
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
FROM applications;