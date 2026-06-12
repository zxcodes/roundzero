-- migrate:up
ALTER TABLE reports ADD COLUMN answer_authenticity jsonb DEFAULT null;

-- migrate:down
