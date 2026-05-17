import { Sql } from "postgres";

export const createReportQuery = `-- name: createReport :one
INSERT INTO reports (interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
RETURNING id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at`;

export interface createReportArgs {
    interviewId: string;
    applicationId: string;
    summary: string;
    strengths: any;
    weaknesses: any;
    insights: any;
    evidence: any;
    screeningAnswers: any;
    scores: any;
    recommendation: string;
    model: string | null;
    promptVersion: string | null;
    refineVersion: string | null;
}

export interface createReportRow {
    id: string;
    interviewId: string;
    applicationId: string;
    summary: string;
    strengths: any;
    weaknesses: any;
    insights: any;
    evidence: any;
    screeningAnswers: any;
    scores: any;
    recommendation: string;
    model: string | null;
    promptVersion: string | null;
    refineVersion: string | null;
    createdAt: Date;
}

export async function createReport(sql: Sql, args: createReportArgs): Promise<createReportRow | null> {
    const rows = await sql.unsafe(createReportQuery, [args.interviewId, args.applicationId, args.summary, args.strengths, args.weaknesses, args.insights, args.evidence, args.screeningAnswers, args.scores, args.recommendation, args.model, args.promptVersion, args.refineVersion]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        summary: row[3],
        strengths: row[4],
        weaknesses: row[5],
        insights: row[6],
        evidence: row[7],
        screeningAnswers: row[8],
        scores: row[9],
        recommendation: row[10],
        model: row[11],
        promptVersion: row[12],
        refineVersion: row[13],
        createdAt: row[14]
    };
}

export const getReportByApplicationIdQuery = `-- name: getReportByApplicationId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at
FROM reports
WHERE application_id = $1`;

export interface getReportByApplicationIdArgs {
    applicationId: string;
}

export interface getReportByApplicationIdRow {
    id: string;
    interviewId: string;
    applicationId: string;
    summary: string;
    strengths: any;
    weaknesses: any;
    insights: any;
    evidence: any;
    screeningAnswers: any;
    scores: any;
    recommendation: string;
    model: string | null;
    promptVersion: string | null;
    refineVersion: string | null;
    createdAt: Date;
}

export async function getReportByApplicationId(sql: Sql, args: getReportByApplicationIdArgs): Promise<getReportByApplicationIdRow | null> {
    const rows = await sql.unsafe(getReportByApplicationIdQuery, [args.applicationId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        summary: row[3],
        strengths: row[4],
        weaknesses: row[5],
        insights: row[6],
        evidence: row[7],
        screeningAnswers: row[8],
        scores: row[9],
        recommendation: row[10],
        model: row[11],
        promptVersion: row[12],
        refineVersion: row[13],
        createdAt: row[14]
    };
}

export const getReportByIdQuery = `-- name: getReportById :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at
FROM reports
WHERE id = $1`;

export interface getReportByIdArgs {
    id: string;
}

export interface getReportByIdRow {
    id: string;
    interviewId: string;
    applicationId: string;
    summary: string;
    strengths: any;
    weaknesses: any;
    insights: any;
    evidence: any;
    screeningAnswers: any;
    scores: any;
    recommendation: string;
    model: string | null;
    promptVersion: string | null;
    refineVersion: string | null;
    createdAt: Date;
}

export async function getReportById(sql: Sql, args: getReportByIdArgs): Promise<getReportByIdRow | null> {
    const rows = await sql.unsafe(getReportByIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        summary: row[3],
        strengths: row[4],
        weaknesses: row[5],
        insights: row[6],
        evidence: row[7],
        screeningAnswers: row[8],
        scores: row[9],
        recommendation: row[10],
        model: row[11],
        promptVersion: row[12],
        refineVersion: row[13],
        createdAt: row[14]
    };
}

export const getReportByInterviewIdQuery = `-- name: getReportByInterviewId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, model, prompt_version, refine_version, created_at
FROM reports
WHERE interview_id = $1`;

export interface getReportByInterviewIdArgs {
    interviewId: string;
}

export interface getReportByInterviewIdRow {
    id: string;
    interviewId: string;
    applicationId: string;
    summary: string;
    strengths: any;
    weaknesses: any;
    insights: any;
    evidence: any;
    screeningAnswers: any;
    scores: any;
    recommendation: string;
    model: string | null;
    promptVersion: string | null;
    refineVersion: string | null;
    createdAt: Date;
}

export async function getReportByInterviewId(sql: Sql, args: getReportByInterviewIdArgs): Promise<getReportByInterviewIdRow | null> {
    const rows = await sql.unsafe(getReportByInterviewIdQuery, [args.interviewId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        summary: row[3],
        strengths: row[4],
        weaknesses: row[5],
        insights: row[6],
        evidence: row[7],
        screeningAnswers: row[8],
        scores: row[9],
        recommendation: row[10],
        model: row[11],
        promptVersion: row[12],
        refineVersion: row[13],
        createdAt: row[14]
    };
}

export const getReportsByJobIdQuery = `-- name: getReportsByJobId :many
SELECT r.id, r.interview_id, r.application_id, r.summary, r.strengths, r.weaknesses, r.insights, r.evidence, r.screening_answers, r.scores, r.recommendation, r.model, r.prompt_version, r.refine_version, r.created_at,
       a.job_id
FROM reports r
JOIN applications a ON a.id = r.application_id
WHERE a.job_id = $1
ORDER BY r.created_at DESC`;

export interface getReportsByJobIdArgs {
    jobId: string;
}

export interface getReportsByJobIdRow {
    id: string;
    interviewId: string;
    applicationId: string;
    summary: string;
    strengths: any;
    weaknesses: any;
    insights: any;
    evidence: any;
    screeningAnswers: any;
    scores: any;
    recommendation: string;
    model: string | null;
    promptVersion: string | null;
    refineVersion: string | null;
    createdAt: Date;
    jobId: string;
}

export async function getReportsByJobId(sql: Sql, args: getReportsByJobIdArgs): Promise<getReportsByJobIdRow[]> {
    return (await sql.unsafe(getReportsByJobIdQuery, [args.jobId]).values()).map(row => ({
        id: row[0],
        interviewId: row[1],
        applicationId: row[2],
        summary: row[3],
        strengths: row[4],
        weaknesses: row[5],
        insights: row[6],
        evidence: row[7],
        screeningAnswers: row[8],
        scores: row[9],
        recommendation: row[10],
        model: row[11],
        promptVersion: row[12],
        refineVersion: row[13],
        createdAt: row[14],
        jobId: row[15]
    }));
}

