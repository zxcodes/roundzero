import { Sql } from "postgres";

export const getReportByApplicationIdQuery = `-- name: getReportByApplicationId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, scores, recommendation, created_at
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
    scores: any;
    recommendation: string;
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
        scores: row[8],
        recommendation: row[9],
        createdAt: row[10]
    };
}

export const getReportByIdQuery = `-- name: getReportById :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, scores, recommendation, created_at
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
    scores: any;
    recommendation: string;
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
        scores: row[8],
        recommendation: row[9],
        createdAt: row[10]
    };
}

export const getReportsByJobIdQuery = `-- name: getReportsByJobId :many
SELECT r.id, r.interview_id, r.application_id, r.summary, r.strengths, r.weaknesses, r.insights, r.evidence, r.scores, r.recommendation, r.created_at,
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
    scores: any;
    recommendation: string;
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
        scores: row[8],
        recommendation: row[9],
        createdAt: row[10],
        jobId: row[11]
    }));
}

