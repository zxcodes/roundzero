import { Sql } from "postgres";

export const upsertApplicationFollowupQuery = `-- name: upsertApplicationFollowup :one
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
RETURNING id, application_id, questions, answers, status, due_at, submitted_at, created_at, updated_at`;

export interface upsertApplicationFollowupArgs {
    applicationId: string;
    questions: any;
    answers: any;
    status: string;
    dueAt: Date;
    submittedAt: Date | null;
}

export interface upsertApplicationFollowupRow {
    id: string;
    applicationId: string;
    questions: any;
    answers: any;
    status: string;
    dueAt: Date;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function upsertApplicationFollowup(sql: Sql, args: upsertApplicationFollowupArgs): Promise<upsertApplicationFollowupRow | null> {
    const rows = await sql.unsafe(upsertApplicationFollowupQuery, [args.applicationId, args.questions, args.answers, args.status, args.dueAt, args.submittedAt]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        questions: row[2],
        answers: row[3],
        status: row[4],
        dueAt: row[5],
        submittedAt: row[6],
        createdAt: row[7],
        updatedAt: row[8]
    };
}

export const getApplicationFollowupByApplicationIdQuery = `-- name: getApplicationFollowupByApplicationId :one
SELECT id, application_id, questions, answers, status, due_at, submitted_at, created_at, updated_at
FROM application_followups
WHERE application_id = $1`;

export interface getApplicationFollowupByApplicationIdArgs {
    applicationId: string;
}

export interface getApplicationFollowupByApplicationIdRow {
    id: string;
    applicationId: string;
    questions: any;
    answers: any;
    status: string;
    dueAt: Date;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getApplicationFollowupByApplicationId(sql: Sql, args: getApplicationFollowupByApplicationIdArgs): Promise<getApplicationFollowupByApplicationIdRow | null> {
    const rows = await sql.unsafe(getApplicationFollowupByApplicationIdQuery, [args.applicationId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        questions: row[2],
        answers: row[3],
        status: row[4],
        dueAt: row[5],
        submittedAt: row[6],
        createdAt: row[7],
        updatedAt: row[8]
    };
}

export const getApplicationFollowupForCandidateQuery = `-- name: getApplicationFollowupForCandidate :one
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
  AND a.candidate_id = $2`;

export interface getApplicationFollowupForCandidateArgs {
    applicationId: string;
    candidateId: string;
}

export interface getApplicationFollowupForCandidateRow {
    id: string;
    applicationId: string;
    questions: any;
    answers: any;
    status: string;
    dueAt: Date;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    candidateId: string;
    applicationStatus: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
}

export async function getApplicationFollowupForCandidate(sql: Sql, args: getApplicationFollowupForCandidateArgs): Promise<getApplicationFollowupForCandidateRow | null> {
    const rows = await sql.unsafe(getApplicationFollowupForCandidateQuery, [args.applicationId, args.candidateId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        questions: row[2],
        answers: row[3],
        status: row[4],
        dueAt: row[5],
        submittedAt: row[6],
        createdAt: row[7],
        updatedAt: row[8],
        candidateId: row[9],
        applicationStatus: row[10],
        jobId: row[11],
        jobTitle: row[12],
        companyName: row[13]
    };
}

export const submitApplicationFollowupAnswersQuery = `-- name: submitApplicationFollowupAnswers :one
UPDATE application_followups
SET answers = $2,
    status = 'submitted',
    submitted_at = now(),
    updated_at = now()
WHERE application_id = $1
RETURNING id, application_id, questions, answers, status, due_at, submitted_at, created_at, updated_at`;

export interface submitApplicationFollowupAnswersArgs {
    applicationId: string;
    answers: any;
}

export interface submitApplicationFollowupAnswersRow {
    id: string;
    applicationId: string;
    questions: any;
    answers: any;
    status: string;
    dueAt: Date;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function submitApplicationFollowupAnswers(sql: Sql, args: submitApplicationFollowupAnswersArgs): Promise<submitApplicationFollowupAnswersRow | null> {
    const rows = await sql.unsafe(submitApplicationFollowupAnswersQuery, [args.applicationId, args.answers]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        questions: row[2],
        answers: row[3],
        status: row[4],
        dueAt: row[5],
        submittedAt: row[6],
        createdAt: row[7],
        updatedAt: row[8]
    };
}

