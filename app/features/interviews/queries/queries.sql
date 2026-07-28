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
SET batch_id = NULL,
    metadata = $2,
    status = 'pending',
    invited_at = $3,
    started_at = NULL,
    completed_at = NULL,
    expired_at = NULL,
    cancelled_at = NULL,
    cancellation_reason = NULL,
    updated_at = now()
WHERE interviews.id = $1
  AND status IN ('expired', 'cancelled', 'pending', 'in_progress')
  AND NOT EXISTS (SELECT 1 FROM reports WHERE application_id = interviews.application_id)
RETURNING *;

-- name: deleteCommunicationAssessmentByInterviewId :exec
DELETE FROM communication_assessments
WHERE interview_id = $1;

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
  AND status IN ('pending', 'in_progress')
  AND (metadata->>'expiresAt')::timestamptz <= now()
RETURNING *;

-- name: cancelInterview :one
UPDATE interviews
SET status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = $2,
    updated_at = now()
WHERE id = $1
  AND status IN ('pending', 'in_progress', 'awaiting_voice')
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

-- name: claimInterviewTurn :one
WITH retried AS (
  UPDATE interview_messages turn_message
  SET generation_status = 'processing'
  WHERE turn_message.interview_id = $1
    AND turn_message.turn_id = $2
    AND turn_message.role = 'candidate'
    AND turn_message.generation_status = 'failed'
    AND NOT EXISTS (
      SELECT 1
      FROM interview_messages active_turn
      WHERE active_turn.interview_id = $1
        AND active_turn.role = 'candidate'
        AND active_turn.generation_status = 'processing'
    )
  RETURNING turn_message.id, turn_message.interview_id, turn_message.role,
            turn_message.content, turn_message.created_at, turn_message.position
), inserted AS (
  INSERT INTO interview_messages (interview_id, turn_id, role, content, generation_status)
  SELECT $1, $2, 'candidate', $3, 'processing'
  WHERE NOT EXISTS (SELECT 1 FROM retried)
  ON CONFLICT DO NOTHING
  RETURNING id, interview_id, role, content, created_at, position
)
SELECT * FROM retried
UNION ALL
SELECT * FROM inserted
LIMIT 1;

-- name: createInterviewMessage :one
INSERT INTO interview_messages (interview_id, turn_id, role, content)
VALUES ($1, $2, $3, $4)
ON CONFLICT (interview_id, turn_id, role) DO NOTHING
RETURNING id, interview_id, role, content, created_at, position;

-- name: completeInterviewTurnWithAssistant :one
WITH inserted AS (
  INSERT INTO interview_messages (interview_id, turn_id, role, content)
  VALUES ($1, $2, 'assistant', $3)
  ON CONFLICT (interview_id, turn_id, role) DO NOTHING
  RETURNING id, interview_id, role, content, created_at, position
), completed AS (
  UPDATE interview_messages candidate_message
  SET generation_status = 'completed'
  WHERE candidate_message.interview_id = $1
    AND candidate_message.turn_id = $2
    AND candidate_message.role = 'candidate'
    AND candidate_message.generation_status = 'processing'
    AND EXISTS (SELECT 1 FROM inserted)
  RETURNING candidate_message.id
)
SELECT inserted.*
FROM inserted
WHERE EXISTS (SELECT 1 FROM completed);

-- name: completeInterviewTurnWithAssistantAndSubmitForVoice :one
WITH locked_interview AS MATERIALIZED (
  SELECT interviews.id
  FROM interviews
  WHERE interviews.id = sqlc.arg('interview_id')
    AND interviews.status = 'in_progress'
  FOR UPDATE
), inserted AS (
  INSERT INTO interview_messages (interview_id, turn_id, role, content)
  SELECT locked_interview.id, sqlc.arg('turn_id'), 'assistant', sqlc.arg('content')
  FROM locked_interview
  ON CONFLICT (interview_id, turn_id, role) DO NOTHING
  RETURNING id, interview_id, role, content, created_at, position
), completed AS (
  UPDATE interview_messages candidate_message
  SET generation_status = 'completed'
  WHERE candidate_message.interview_id = sqlc.arg('interview_id')
    AND candidate_message.turn_id = sqlc.arg('turn_id')
    AND candidate_message.role = 'candidate'
    AND candidate_message.generation_status = 'processing'
    AND EXISTS (SELECT 1 FROM inserted)
  RETURNING candidate_message.id
), submitted AS (
  UPDATE interviews interview
  SET status = 'awaiting_voice',
      updated_at = now()
  WHERE interview.id = sqlc.arg('interview_id')
    AND EXISTS (SELECT 1 FROM completed)
  RETURNING interview.id
)
SELECT inserted.*
FROM inserted
WHERE EXISTS (SELECT 1 FROM submitted);

-- name: claimInterviewGreeting :one
INSERT INTO interview_messages (interview_id, turn_id, role, content, generation_status)
VALUES ($1, 'greeting', 'assistant', '', 'processing')
ON CONFLICT (interview_id, turn_id, role) DO NOTHING
RETURNING id, interview_id, role, content, created_at, position;

-- name: completeInterviewGreeting :one
UPDATE interview_messages
SET content = $2,
    generation_status = 'completed'
WHERE interview_id = $1
  AND turn_id = 'greeting'
  AND role = 'assistant'
  AND generation_status = 'processing'
RETURNING id, interview_id, role, content, created_at, position;

-- name: failInterviewGreeting :exec
DELETE FROM interview_messages
WHERE interview_id = $1
  AND turn_id = 'greeting'
  AND role = 'assistant'
  AND generation_status = 'processing';

-- name: failInterviewTurn :exec
UPDATE interview_messages
SET generation_status = 'failed'
WHERE interview_id = $1
  AND turn_id = $2
  AND role = 'candidate'
  AND generation_status = 'processing';

-- name: getInterviewMessagesByInterviewId :many
SELECT id, interview_id, role, content, created_at, position
FROM interview_messages
WHERE interview_id = $1
  AND (generation_status IS NULL OR generation_status = 'completed')
ORDER BY position ASC;
