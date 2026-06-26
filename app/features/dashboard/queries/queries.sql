-- name: getReleasedReportsForCompanyDashboard :many
-- One row per application: the latest released report. An application can have
-- multiple released reports (multiple interviews across batches), so dedupe
-- with DISTINCT ON to avoid double-counting candidates on the dashboard. The
-- caller re-sorts (by score / released_at), so the a.id-first ordering here is
-- only to satisfy DISTINCT ON.
SELECT DISTINCT ON (a.id)
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
ORDER BY a.id, r.released_at DESC, r.created_at DESC;