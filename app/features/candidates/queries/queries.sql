-- name: createCandidateProfile :one
INSERT INTO candidate_profiles (user_id, headline, resume_key, onboarding_completed_at, resume_updated_at)
VALUES ($1, $2, $3, now(), CASE WHEN $3::text IS NOT NULL THEN now() ELSE NULL END)
RETURNING *;

-- name: getCandidateProfileByUserId :one
SELECT *
FROM candidate_profiles
WHERE user_id = $1;

-- name: getCandidateWorkHistoryByProfileId :many
SELECT *
FROM candidate_work_history
WHERE candidate_profile_id = $1
ORDER BY sort_order ASC, created_at ASC;

-- name: createCandidateWorkHistoryEntry :one
INSERT INTO candidate_work_history (
  candidate_profile_id,
  company,
  title,
  start_month,
  end_month,
  currently_working_here,
  description,
  sort_order
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: deleteCandidateWorkHistoryByProfileId :exec
DELETE FROM candidate_work_history
WHERE candidate_profile_id = $1;

-- name: updateCandidateProfile :one
UPDATE candidate_profiles
SET headline = $1,
    resume_key = $2,
    bio = $3,
    skills = $4,
    links = $5,
    resume_updated_at = CASE WHEN $2 IS DISTINCT FROM resume_key THEN now() ELSE resume_updated_at END,
    updated_at = now()
WHERE user_id = $6
RETURNING *;
