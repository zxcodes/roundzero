-- name: createInterview :one
INSERT INTO interviews (application_id, agent_id, type, metadata, status, invited_at, started_at, completed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: getInterviewByApplicationId :one
SELECT *
FROM interviews
WHERE application_id = $1;

-- name: getInterviewById :one
SELECT *
FROM interviews
WHERE id = $1;

-- name: getInterviewForCandidateById :one
SELECT i.id, i.application_id, i.agent_id, i.type, i.metadata, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       a.candidate_id, a.status AS application_status,
       a.job_id, j.title AS job_title, c.name AS company_name
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE i.id = $1
  AND a.candidate_id = $2;

-- name: getInterviewsByCandidate :many
SELECT i.id, i.application_id, i.agent_id, i.type, i.metadata, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       a.candidate_id, a.status AS application_status,
       a.job_id, j.title AS job_title, c.name AS company_name
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE a.candidate_id = $1
ORDER BY i.updated_at DESC;

-- name: updateInterviewStatus :one
UPDATE interviews
SET status = $1,
    updated_at = now()
WHERE id = $2
RETURNING *;

-- name: completeInterview :one
UPDATE interviews
SET status = 'completed',
    completed_at = now(),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: expireInterview :one
UPDATE interviews
SET status = 'expired',
    expired_at = now(),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: cancelInterview :one
UPDATE interviews
SET status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: getInterviewContextById :one
SELECT i.id, i.application_id, i.batch_id, i.agent_id, i.type, i.metadata, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       a.candidate_id, a.status AS application_status,
       j.id AS job_id, j.title AS job_title,
       c.name AS company_name,
       c.owner_id AS company_owner_id,
       u.name AS candidate_name
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
JOIN users u ON u.id = a.candidate_id
WHERE i.id = $1;

-- name: countInterviewSlotsUsedByJob :one
SELECT count(*)::int AS count
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE a.job_id = $1;

-- name: countActiveInterviewSlotsByJob :one
SELECT count(*)::int AS count
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE a.job_id = $1
  AND i.status IN ('pending', 'in_progress');

-- name: getBestBackfillCandidateByJob :one
SELECT a.id AS application_id,
       a.candidate_id,
       pe.next_step,
       pe.score
FROM applications a
JOIN pre_evaluations pe ON pe.application_id = a.id
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
WHERE a.job_id = $1
  AND a.status = 'pre_screening'
  AND pe.next_step = 'interview_invited'
  AND NOT EXISTS (
    SELECT 1
    FROM interviews i
    WHERE i.application_id = a.id
  )
ORDER BY pe.score DESC, pe.created_at ASC
LIMIT 1;

-- name: getInterviewsPastDeadline :many
SELECT i.id,
       i.application_id,
       a.candidate_id,
       a.job_id,
       j.title AS job_title
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
WHERE i.status IN ('pending', 'in_progress')
  AND i.metadata ? 'expiresAt'
  AND (i.metadata->>'expiresAt')::timestamptz <= now();

-- name: createCommunicationAssessment :one
INSERT INTO communication_assessments (interview_id, application_id, status)
VALUES ($1, $2, $3)
RETURNING *;

-- name: getCommunicationAssessmentByInterviewId :one
SELECT *
FROM communication_assessments
WHERE interview_id = $1;

-- name: getCommunicationAssessmentByApplicationId :one
SELECT *
FROM communication_assessments
WHERE application_id = $1;

-- name: markCommunicationAssessmentStarted :one
UPDATE communication_assessments
SET status = 'in_progress',
    started_at = COALESCE(started_at, now()),
    updated_at = now()
WHERE interview_id = $1
RETURNING *;

-- name: completeCommunicationAssessment :one
UPDATE communication_assessments
SET status = 'completed',
    transcript = $2,
    analysis = $3,
    audio_key = $4,
    completed_at = now(),
    updated_at = now()
WHERE interview_id = $1
RETURNING *;

-- name: markCommunicationAssessmentSkipped :one
UPDATE communication_assessments
SET status = 'skipped',
    completed_at = now(),
    updated_at = now()
WHERE interview_id = $1
RETURNING *;
