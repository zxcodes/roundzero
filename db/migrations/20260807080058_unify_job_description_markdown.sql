-- migrate:up
WITH missing_requirements AS (
  SELECT
    jobs.id,
    string_agg('- ' || btrim(requirement.value), E'\n' ORDER BY requirement.ordinality) AS markdown
  FROM jobs
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE
      WHEN jsonb_typeof(jobs.requirements) = 'array' THEN jobs.requirements
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS requirement(value, ordinality)
  WHERE btrim(requirement.value) <> ''
    AND strpos(lower(jobs.description), lower(btrim(requirement.value))) = 0
  GROUP BY jobs.id
)
UPDATE jobs
SET
  description = rtrim(jobs.description)
    || E'\n\n## Requirements\n\n'
    || missing_requirements.markdown,
  updated_at = now()
FROM missing_requirements
WHERE jobs.id = missing_requirements.id;

ALTER TABLE jobs DROP COLUMN requirements;

-- migrate:down
