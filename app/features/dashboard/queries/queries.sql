-- name: getReleasedReportsForCompanyDashboard :many
SELECT
  r.id AS report_id,
  r.application_id,
  r.recommendation,
  r.scores,
  r.strengths,
  r.weaknesses,
  r.released_at,
  a.status AS application_status,
  a.job_id,
  j.title AS job_title,
  u.name AS candidate_name,
  pe.confidence AS pre_evaluation_confidence
FROM reports r
JOIN applications a ON a.id = r.application_id
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
LEFT JOIN pre_evaluations pe ON pe.application_id = a.id
WHERE j.company_id = $1
  AND j.archived_at IS NULL
  AND r.released_at IS NOT NULL
ORDER BY r.released_at DESC;

-- name: getRecentCompanyApplicationActivity :many
SELECT
  a.id AS application_id,
  a.status,
  a.updated_at,
  j.title AS job_title,
  u.name AS candidate_name
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
WHERE j.company_id = $1
  AND j.archived_at IS NULL
  AND a.status IN ('shortlisted', 'rejected', 'evaluated', 'interview_invited')
ORDER BY a.updated_at DESC
LIMIT 12;