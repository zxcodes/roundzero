-- name: createInterview :one
INSERT INTO interviews (application_id, agent_id, type, metadata, status, invited_at, started_at, completed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: getInterviewByApplicationId :one
SELECT *
FROM interviews
WHERE application_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: getInterviewForCompanyByApplicationId :one
-- Company-facing projection. Excludes interviews.metadata (job snapshot,
-- screening coverage, integrity telemetry) and agent_id.
SELECT i.id, i.application_id, i.batch_id, i.type, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       i.metadata->>'expiresAt' AS expires_at
FROM interviews i
WHERE i.application_id = $1
ORDER BY i.created_at DESC
LIMIT 1;

-- name: getInterviewForCandidateById :one
-- Candidate-facing projection. Deliberately excludes interviews.metadata and
-- agent_id: metadata holds the AI runtime context (system-prompt inputs, the
-- company's screening questions, the candidate's pre-eval authenticity flags +
-- internal scores) which must never reach the candidate. Only the expiry
-- deadline is surfaced, as expires_at.
SELECT i.id, i.application_id, i.type, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       i.metadata->>'expiresAt' AS expires_at,
       a.candidate_id, a.status AS application_status,
       a.job_id, j.title AS job_title, c.name AS company_name
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE i.id = $1
  AND a.candidate_id = $2;

-- name: getInterviewForCandidateByApplicationId :one
-- Same candidate-safe projection as getInterviewForCandidateById, keyed by the
-- application instead of the interview id.
SELECT i.id, i.application_id, i.type, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       i.metadata->>'expiresAt' AS expires_at,
       a.candidate_id, a.status AS application_status,
       a.job_id, j.title AS job_title, c.name AS company_name
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE a.id = $1
  AND a.candidate_id = $2
ORDER BY i.created_at DESC
LIMIT 1;

-- name: getInterviewsByCandidate :many
-- Candidate-facing projection; see getInterviewForCandidateById for why
-- metadata/agent_id are excluded.
SELECT i.id, i.application_id, i.type, i.status, i.invited_at, i.started_at, i.completed_at,
       i.expired_at, i.cancelled_at, i.cancellation_reason, i.created_at, i.updated_at,
       i.metadata->>'expiresAt' AS expires_at,
       a.candidate_id, a.status AS application_status,
       a.job_id, j.title AS job_title, c.name AS company_name
FROM interviews i
JOIN applications a ON a.id = i.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE a.candidate_id = $1
ORDER BY i.updated_at DESC;

-- name: getActiveInterviewsByJob :many
SELECT i.id, i.application_id, i.status, i.metadata->>'expiresAt' AS expires_at
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE a.job_id = $1
  AND i.status IN ('pending', 'in_progress')
ORDER BY i.created_at DESC;

-- name: resetInterviewInvite :one
UPDATE interviews
SET metadata = COALESCE(metadata, '{}'::jsonb) || $2,
    status = 'pending',
    invited_at = $3,
    started_at = NULL,
    completed_at = NULL,
    expired_at = NULL,
    cancelled_at = NULL,
    cancellation_reason = NULL,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: updateInterviewStatus :one
UPDATE interviews
SET status = $1,
    updated_at = now()
WHERE id = $2
RETURNING *;

-- name: submitInterviewForVoice :one
-- Text interview submitted; voice assessment still required before completion.
-- Conditional on `in_progress` so a re-submit/race can't overwrite a terminal
-- state (cancelled/expired) or an already-advanced interview.
UPDATE interviews
SET status = 'awaiting_voice',
    updated_at = now()
WHERE id = $1
  AND status = 'in_progress'
RETURNING *;

-- name: completeInterviewAfterVoice :one
-- Voice assessment finished — the interview is now fully completed (text+voice).
-- Conditional on `awaiting_voice` so a late webhook can't resurrect an
-- expired/cancelled interview.
UPDATE interviews
SET status = 'completed',
    completed_at = now(),
    updated_at = now()
WHERE id = $1
  AND status = 'awaiting_voice'
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

-- name: updateInterviewMetadata :one
UPDATE interviews
SET metadata = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: getInterviewRuntimeInputsByApplicationId :one
SELECT a.metadata AS application_metadata,
       u.name AS candidate_name,
       pe.score,
       pe.missing_requirements,
       pe.consistency_score,
       pe.raw_response
FROM applications a
JOIN users u ON u.id = a.candidate_id
LEFT JOIN pre_evaluations pe ON pe.application_id = a.id
WHERE a.id = $1;

-- name: deleteInterviewMessagesByInterviewId :exec
DELETE FROM interview_messages
WHERE interview_id = $1;

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

-- name: countActiveInterviewSlotsByJob :one
SELECT count(*)::int AS count
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE a.job_id = $1
  AND i.status IN ('pending', 'in_progress');

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

-- name: getCommunicationAssessmentByProviderConversationId :one
SELECT *
FROM communication_assessments
WHERE provider_conversation_id = $1;

-- name: getCommunicationAssessmentByProviderSessionId :one
SELECT *
FROM communication_assessments
WHERE provider_session_id = $1;

-- name: registerCommunicationAssessmentSession :one
UPDATE communication_assessments
SET provider_session_id = $2,
    provider_conversation_id = NULL,
    updated_at = now()
WHERE interview_id = $1
RETURNING *;

-- name: registerCommunicationAssessmentConversation :one
UPDATE communication_assessments
SET provider_conversation_id = $2,
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
  AND status != 'completed'
  AND status != 'skipped'
RETURNING *;

-- name: updateCommunicationAssessmentAnalysis :one
UPDATE communication_assessments
SET analysis = $2,
    updated_at = now()
WHERE interview_id = $1
  AND status = 'completed'
  AND analysis IS NULL
RETURNING *;

-- name: createInterviewMessage :one
INSERT INTO interview_messages (interview_id, role, content)
VALUES ($1, $2, $3)
RETURNING id, interview_id, role, content, created_at, position;

-- name: getInterviewMessagesByInterviewId :many
SELECT id, interview_id, role, content, created_at, position
FROM interview_messages
WHERE interview_id = $1
ORDER BY position ASC;
