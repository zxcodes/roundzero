-- migrate:up
ALTER TABLE jobs RENAME COLUMN interview_questions TO screening_questions;

-- migrate:down
