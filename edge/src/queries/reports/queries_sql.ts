import { Sql } from "postgres";

export const createReportQuery = `-- name: createReport :one
INSERT INTO reports (interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, created_at`;

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
    createdAt: Date;
}

export async function createReport(sql: Sql, args: createReportArgs): Promise<createReportRow | null> {
    const rows = await sql.unsafe(createReportQuery, [args.interviewId, args.applicationId, args.summary, args.strengths, args.weaknesses, args.insights, args.evidence, args.screeningAnswers, args.scores, args.recommendation]).values();
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
        createdAt: row[11]
    };
}

export const getReportByInterviewIdQuery = `-- name: getReportByInterviewId :one
SELECT id, interview_id, application_id, summary, strengths, weaknesses, insights, evidence, screening_answers, scores, recommendation, created_at
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
        createdAt: row[11]
    };
}

