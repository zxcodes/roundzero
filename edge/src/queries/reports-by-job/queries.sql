-- name: countReportsByJob :one
SELECT count(*)::int AS count
FROM reports r
JOIN applications a ON a.id = r.application_id
WHERE a.job_id = $1;
