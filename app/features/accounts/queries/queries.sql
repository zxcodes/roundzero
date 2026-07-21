-- name: listAccountsPendingErasure :many
-- Grace interval must match ACCOUNT_ERASURE_GRACE_DAYS in app/features/accounts/config.ts
SELECT id
FROM users
WHERE deleted_at IS NOT NULL
  AND deleted_at < now() - interval '30 days'
  AND anonymized_at IS NULL
ORDER BY deleted_at ASC
LIMIT sqlc.arg('limit')::int;

-- name: getUserErasureState :one
SELECT id, deleted_at, anonymized_at
FROM users
WHERE id = $1;

-- name: lockUserErasureState :one
SELECT id, deleted_at, anonymized_at
FROM users
WHERE id = $1
FOR UPDATE;

-- name: listResumeKeysForUser :many
SELECT resume_key AS key
FROM candidate_profiles
WHERE user_id = $1
  AND resume_key IS NOT NULL
UNION
SELECT resume_key AS key
FROM applications
WHERE candidate_id = $1
  AND resume_key IS NOT NULL;

-- name: listVoiceAudioKeysForUser :many
SELECT ca.audio_key AS key
FROM communication_assessments ca
JOIN applications a ON a.id = ca.application_id
WHERE a.candidate_id = $1
  AND ca.audio_key IS NOT NULL;

-- name: scrubCandidateProfileForUser :exec
UPDATE candidate_profiles
SET resume_key = NULL,
    resume_updated_at = NULL,
    matching_profile = NULL,
    matching_profile_source_hash = NULL,
    matching_profile_version = NULL,
    matching_profile_status = 'pending',
    matching_profile_error = NULL,
    serving_match_generation = NULL,
    serving_match_input_hash = NULL,
    match_feed_status = 'pending',
    match_feed_error = NULL,
    match_feed_refreshed_at = NULL,
    match_alerts_enabled = false,
    match_alerts_enabled_at = NULL,
    match_refresh_token = NULL,
    match_refresh_claimed_at = NULL,
    updated_at = now()
WHERE user_id = $1;

-- name: deleteCandidateJobMatchesForUser :exec
DELETE FROM candidate_job_matches
WHERE candidate_id = $1;

-- name: scrubApplicationsForUser :exec
UPDATE applications
SET resume_key = NULL,
    metadata = '{}'::jsonb,
    updated_at = now()
WHERE candidate_id = $1;

-- name: redactInterviewMessagesForUser :exec
UPDATE interview_messages im
SET content = '[redacted]'
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE im.interview_id = i.id
  AND a.candidate_id = $1;

-- name: redactInterviewsForUser :exec
UPDATE interviews i
SET metadata = COALESCE(
      NULLIF(
        jsonb_strip_nulls(
          jsonb_build_object(
            'expiresAt', i.metadata->'expiresAt',
            'jobSnapshot', i.metadata->'jobSnapshot',
            'screeningCoverage', i.metadata->'screeningCoverage',
            'integrity', i.metadata->'integrity'
          )
        ),
        '{}'::jsonb
      ),
      '{}'::jsonb
    ),
    updated_at = now()
FROM applications a
WHERE i.application_id = a.id
  AND a.candidate_id = $1;

-- name: redactCommunicationAssessmentsForUser :exec
UPDATE communication_assessments ca
SET transcript = '[]'::jsonb,
    analysis = NULL,
    audio_key = NULL,
    updated_at = now()
FROM applications a
WHERE ca.application_id = a.id
  AND a.candidate_id = $1;

-- name: redactPreEvaluationsForUser :exec
UPDATE pre_evaluations pe
SET raw_response = NULL
FROM applications a
WHERE pe.application_id = a.id
  AND a.candidate_id = $1;

-- name: redactReportsForUser :exec
UPDATE reports r
SET summary = '[redacted]',
    strengths = '[]'::jsonb,
    weaknesses = '[]'::jsonb,
    insights = '[]'::jsonb,
    evidence = '[]'::jsonb,
    screening_answers = '[]'::jsonb,
    answer_authenticity = NULL
FROM applications a
WHERE r.application_id = a.id
  AND a.candidate_id = $1;

-- name: deleteNotificationsForUser :exec
DELETE FROM notifications
WHERE user_id = $1;

-- name: deleteFeedbackForUser :exec
DELETE FROM feedback
WHERE user_id = $1;

-- name: listOwnedCompanyIdsForUser :many
SELECT id
FROM companies
WHERE owner_id = $1;

-- name: countOtherActiveCompanyMembers :one
SELECT count(*)::int AS count
FROM company_members
WHERE company_id = $1
  AND user_id != $2
  AND status = 'active';

-- name: archiveOpenJobsForCompany :exec
UPDATE jobs
SET status = 'closed',
    archived_at = now(),
    updated_at = now()
WHERE company_id = $1
  AND status = 'open'
  AND archived_at IS NULL;

-- name: anonymizeUser :one
UPDATE users
SET name = 'Deleted user',
    email = sqlc.arg('placeholderEmail')::text,
    picture = NULL,
    anonymized_at = now(),
    updated_at = now()
WHERE id = sqlc.arg('id')
  AND deleted_at IS NOT NULL
  AND anonymized_at IS NULL
RETURNING id;
