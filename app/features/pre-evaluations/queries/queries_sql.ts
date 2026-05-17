import { Sql } from "postgres";

export const createPreEvaluationQuery = `-- name: createPreEvaluation :one
INSERT INTO pre_evaluations (application_id, score, missing_requirements, confidence, next_step, consistency_score, raw_response, model, prompt_version)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, application_id, score, missing_requirements, confidence, next_step, consistency_score, raw_response, model, prompt_version, created_at`;

export interface createPreEvaluationArgs {
    applicationId: string;
    score: number;
    missingRequirements: any;
    confidence: string;
    nextStep: string;
    consistencyScore: number | null;
    rawResponse: any | null;
    model: string | null;
    promptVersion: string | null;
}

export interface createPreEvaluationRow {
    id: string;
    applicationId: string;
    score: number;
    missingRequirements: any;
    confidence: string;
    nextStep: string;
    consistencyScore: number | null;
    rawResponse: any | null;
    model: string | null;
    promptVersion: string | null;
    createdAt: Date;
}

export async function createPreEvaluation(sql: Sql, args: createPreEvaluationArgs): Promise<createPreEvaluationRow | null> {
    const rows = await sql.unsafe(createPreEvaluationQuery, [args.applicationId, args.score, args.missingRequirements, args.confidence, args.nextStep, args.consistencyScore, args.rawResponse, args.model, args.promptVersion]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        score: row[2],
        missingRequirements: row[3],
        confidence: row[4],
        nextStep: row[5],
        consistencyScore: row[6],
        rawResponse: row[7],
        model: row[8],
        promptVersion: row[9],
        createdAt: row[10]
    };
}

export const getPreEvaluationByApplicationIdQuery = `-- name: getPreEvaluationByApplicationId :one
SELECT id, application_id, score, missing_requirements, confidence, next_step, consistency_score, raw_response, model, prompt_version, created_at
FROM pre_evaluations
WHERE application_id = $1`;

export interface getPreEvaluationByApplicationIdArgs {
    applicationId: string;
}

export interface getPreEvaluationByApplicationIdRow {
    id: string;
    applicationId: string;
    score: number;
    missingRequirements: any;
    confidence: string;
    nextStep: string;
    consistencyScore: number | null;
    rawResponse: any | null;
    model: string | null;
    promptVersion: string | null;
    createdAt: Date;
}

export async function getPreEvaluationByApplicationId(sql: Sql, args: getPreEvaluationByApplicationIdArgs): Promise<getPreEvaluationByApplicationIdRow | null> {
    const rows = await sql.unsafe(getPreEvaluationByApplicationIdQuery, [args.applicationId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        applicationId: row[1],
        score: row[2],
        missingRequirements: row[3],
        confidence: row[4],
        nextStep: row[5],
        consistencyScore: row[6],
        rawResponse: row[7],
        model: row[8],
        promptVersion: row[9],
        createdAt: row[10]
    };
}

