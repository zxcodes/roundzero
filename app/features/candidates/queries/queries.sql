-- name: createCandidateProfile :one
INSERT INTO candidate_profiles (user_id, headline, resume_url)
VALUES ($1, $2, $3)
RETURNING *;

-- name: getCandidateProfileByUserId :one
SELECT *
FROM candidate_profiles
WHERE user_id = $1;

-- name: updateCandidateProfile :one
UPDATE candidate_profiles
SET headline = $1,
    resume_url = $2,
    bio = $3,
    skills = $4,
    work_history = $5,
    links = $6,
    updated_at = now()
WHERE user_id = $7
RETURNING *;
