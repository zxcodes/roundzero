-- migrate:up
ALTER TABLE applications ADD COLUMN queued_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN dedupe_key TEXT;

UPDATE applications
SET queued_at = updated_at
WHERE status = 'queued_for_batch';

-- Preflight failures are deliberately non-destructive. Each statement divides
-- by zero when its named invariant is violated, before indexes/constraints are
-- installed. Run the SELECT inside each EXISTS directly to inspect conflicts.
SELECT 1 / CASE WHEN EXISTS (
  SELECT 1 FROM interviews GROUP BY application_id HAVING count(*) > 1
) THEN 0 ELSE 1 END AS no_duplicate_interviews;

SELECT 1 / CASE WHEN EXISTS (
  SELECT 1 FROM job_batches
  WHERE status IN ('forming', 'active')
  GROUP BY job_id HAVING count(*) > 1
) THEN 0 ELSE 1 END AS no_multiple_active_batches;

SELECT 1 / CASE WHEN EXISTS (
  SELECT 1
  FROM applications a
  JOIN interviews i ON i.application_id = a.id
  WHERE a.status = 'queued_for_batch'
) THEN 0 ELSE 1 END AS no_queued_applications_with_interviews;

SELECT 1 / CASE WHEN EXISTS (
  SELECT 1
  FROM jobs j
  LEFT JOIN LATERAL (
    SELECT count(DISTINCT r.application_id)::int AS delivered
    FROM reports r
    WHERE r.released_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM applications a
        WHERE a.id = r.application_id AND a.job_id = j.id
      )
  ) delivered ON TRUE
  LEFT JOIN LATERAL (
    SELECT count(DISTINCT i.application_id)::int AS reserved
    FROM interviews i
    JOIN applications a ON a.id = i.application_id
    WHERE a.job_id = j.id
      AND i.status IN ('pending', 'in_progress', 'awaiting_voice', 'completed')
      AND NOT EXISTS (
        SELECT 1 FROM reports r
        WHERE r.application_id = i.application_id AND r.released_at IS NOT NULL
      )
  ) reserved ON TRUE
  WHERE delivered.delivered + reserved.reserved > j.final_report_target
) THEN 0 ELSE 1 END AS no_over_capacity_jobs;

SELECT 1 / CASE WHEN EXISTS (
  SELECT 1 FROM applications
  WHERE status = 'queued_for_batch' AND queued_at IS NULL
) THEN 0 ELSE 1 END AS no_queued_applications_without_queue_time;

CREATE UNIQUE INDEX idx_interviews_application_unique
  ON interviews(application_id);
CREATE UNIQUE INDEX idx_job_batches_one_active_per_job
  ON job_batches(job_id)
  WHERE status IN ('forming', 'active');
CREATE UNIQUE INDEX idx_notifications_dedupe
  ON notifications(user_id, type, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE applications
  ADD CONSTRAINT applications_queued_at_matches_status
  CHECK ((status = 'queued_for_batch') = (queued_at IS NOT NULL));


-- migrate:down
