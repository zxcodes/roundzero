-- migrate:up

ALTER TABLE feedback
  ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX idx_feedback_company ON feedback(company_id);

-- migrate:down