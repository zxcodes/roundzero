-- name: createCandidateProfile :one
INSERT INTO candidate_profiles (user_id, headline, resume_key, onboarding_completed_at, resume_updated_at)
VALUES ($1, $2, $3, now(), CASE WHEN $3::text IS NOT NULL THEN now() ELSE NULL END)
RETURNING *;

-- name: getCandidateProfileByUserId :one
SELECT *
FROM candidate_profiles
WHERE user_id = $1;

-- name: updateCandidateProfile :one
UPDATE candidate_profiles
SET headline = $1,
    resume_key = $2,
    skills = $3,
    links = $4,
    resume_updated_at = CASE WHEN $2 IS DISTINCT FROM resume_key THEN now() ELSE resume_updated_at END,
    updated_at = now()
WHERE user_id = $5
RETURNING *;
