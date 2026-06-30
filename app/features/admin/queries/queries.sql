-- name: getPlatformAdminMetrics :one
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
  (SELECT count(*)::int FROM reports WHERE created_at >= now() - interval '7 days') AS new_reports_7d;

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