-- name: upsertApplicationFollowup :one
INSERT INTO application_followups (
  application_id,
  questions,
  answers,
  status,
  due_at,
  submitted_at
)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (application_id) DO UPDATE
SET questions = EXCLUDED.questions,
    answers = EXCLUDED.answers,
    status = EXCLUDED.status,
    due_at = EXCLUDED.due_at,
    submitted_at = EXCLUDED.submitted_at,
    updated_at = now()
RETURNING *;

-- name: getApplicationFollowupByApplicationId :one
SELECT *
FROM application_followups
WHERE application_id = $1;

-- name: getApplicationFollowupForCandidate :one
SELECT af.id,
       af.application_id,
       af.questions,
       af.answers,
       af.status,
       af.due_at,
       af.submitted_at,
       af.created_at,
       af.updated_at,
       a.candidate_id,
       a.status AS application_status,
       a.job_id,
       j.title AS job_title,
       c.name AS company_name
FROM application_followups af
JOIN applications a ON a.id = af.application_id
JOIN jobs j ON j.id = a.job_id
JOIN companies c ON c.id = j.company_id
WHERE af.application_id = $1
  AND a.candidate_id = $2;

-- name: submitApplicationFollowupAnswers :one
UPDATE application_followups
SET answers = $2,
    status = 'submitted',
    submitted_at = now(),
    updated_at = now()
WHERE application_id = $1
RETURNING *;
