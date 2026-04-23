import type { Sql } from "postgres";

export const createInterviewQuery = `-- name: createInterview :one
INSERT INTO interviews (application_id, agent_id, type, metadata, status, started_at, completed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, application_id, agent_id, type, metadata, status, started_at, completed_at, created_at, updated_at`;

export interface createInterviewArgs {
  applicationId: string;
  agentId: string | null;
  type: string;
  metadata: any;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface createInterviewRow {
  id: string;
  applicationId: string;
  agentId: string | null;
  type: string;
  metadata: any;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function createInterview(
  sql: Sql,
  args: createInterviewArgs,
): Promise<createInterviewRow | null> {
  const rows = await sql
    .unsafe(createInterviewQuery, [
      args.applicationId,
      args.agentId,
      args.type,
      args.metadata,
      args.status,
      args.startedAt,
      args.completedAt,
    ])
    .values();
  if (rows.length !== 1) {
    return null;
  }
  const row = rows[0];
  return {
    id: row[0],
    applicationId: row[1],
    agentId: row[2],
    type: row[3],
    metadata: row[4],
    status: row[5],
    startedAt: row[6],
    completedAt: row[7],
    createdAt: row[8],
    updatedAt: row[9],
  };
}

export const getInterviewByApplicationIdQuery = `-- name: getInterviewByApplicationId :one
SELECT id, application_id, agent_id, type, metadata, status, started_at, completed_at, created_at, updated_at
FROM interviews
WHERE application_id = $1`;

export interface getInterviewByApplicationIdArgs {
  applicationId: string;
}

export interface getInterviewByApplicationIdRow {
  id: string;
  applicationId: string;
  agentId: string | null;
  type: string;
  metadata: any;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getInterviewByApplicationId(
  sql: Sql,
  args: getInterviewByApplicationIdArgs,
): Promise<getInterviewByApplicationIdRow | null> {
  const rows = await sql.unsafe(getInterviewByApplicationIdQuery, [args.applicationId]).values();
  if (rows.length !== 1) {
    return null;
  }
  const row = rows[0];
  return {
    id: row[0],
    applicationId: row[1],
    agentId: row[2],
    type: row[3],
    metadata: row[4],
    status: row[5],
    startedAt: row[6],
    completedAt: row[7],
    createdAt: row[8],
    updatedAt: row[9],
  };
}

export const countInterviewSlotsUsedByJobQuery = `-- name: countInterviewSlotsUsedByJob :one
SELECT count(*)::int AS count
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE a.job_id = $1`;

export interface countInterviewSlotsUsedByJobArgs {
  jobId: string;
}

export interface countInterviewSlotsUsedByJobRow {
  count: number;
}

export async function countInterviewSlotsUsedByJob(
  sql: Sql,
  args: countInterviewSlotsUsedByJobArgs,
): Promise<countInterviewSlotsUsedByJobRow | null> {
  const rows = await sql.unsafe(countInterviewSlotsUsedByJobQuery, [args.jobId]).values();
  if (rows.length !== 1) {
    return null;
  }
  const row = rows[0];
  return {
    count: row[0],
  };
}
