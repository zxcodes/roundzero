#!/usr/bin/env bash
set -euo pipefail

database_url=$(grep ^DATABASE_URL= .env | head -1 | cut -d= -f2- | tr -d '"')
if [ -z "$database_url" ]; then
  echo 1>&2 "DATABASE_URL not found in .env"
  exit 1
fi

echo "Resetting user-generated data in: $database_url"
echo

psql "$database_url" <<'SQL'
TRUNCATE TABLE
  communication_assessments,
  interview_messages,
  reports,
  interviews,
  pre_evaluations,
  notifications,
  job_batches,
  applications,
  jobs
RESTART IDENTITY CASCADE;

SELECT 'Reset complete' AS result;
SQL
