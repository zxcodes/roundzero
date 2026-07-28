-- migrate:up
ALTER TABLE interview_messages
  ADD COLUMN turn_id TEXT,
  ADD COLUMN generation_status TEXT;

UPDATE interview_messages
SET turn_id = id::TEXT;

ALTER TABLE interview_messages
  ALTER COLUMN turn_id SET NOT NULL,
  ADD CONSTRAINT interview_messages_generation_status_check
    CHECK (generation_status IS NULL OR generation_status IN ('processing', 'completed', 'failed'));

CREATE UNIQUE INDEX interview_messages_interview_turn_role_key
  ON interview_messages(interview_id, turn_id, role);

CREATE UNIQUE INDEX interview_messages_one_processing_turn_key
  ON interview_messages(interview_id)
  WHERE role = 'candidate' AND generation_status = 'processing';

-- migrate:down
