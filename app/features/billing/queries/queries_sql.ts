import { Sql } from "postgres";

export const getPolarWebhookReceiptQuery = `-- name: getPolarWebhookReceipt :one
SELECT id, event_type, event_timestamp, status, attempt_count, last_error, processed_at, created_at, updated_at
FROM polar_webhook_receipts
WHERE id = $1`;

export interface getPolarWebhookReceiptArgs {
    id: string;
}

export interface getPolarWebhookReceiptRow {
    id: string;
    eventType: string;
    eventTimestamp: Date;
    status: string;
    attemptCount: number;
    lastError: string | null;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getPolarWebhookReceipt(sql: Sql, args: getPolarWebhookReceiptArgs): Promise<getPolarWebhookReceiptRow | null> {
    const rows = await sql.unsafe(getPolarWebhookReceiptQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        eventType: row[1],
        eventTimestamp: row[2],
        status: row[3],
        attemptCount: row[4],
        lastError: row[5],
        processedAt: row[6],
        createdAt: row[7],
        updatedAt: row[8]
    };
}

export const markPolarWebhookProcessingQuery = `-- name: markPolarWebhookProcessing :one
INSERT INTO polar_webhook_receipts (
  id,
  event_type,
  event_timestamp,
  status
) VALUES (
  $1,
  $2,
  $3,
  'processing'
)
ON CONFLICT (id) DO UPDATE
SET event_type = EXCLUDED.event_type,
    event_timestamp = EXCLUDED.event_timestamp,
    status = 'processing',
    attempt_count = polar_webhook_receipts.attempt_count + 1,
    last_error = NULL,
    updated_at = now()
RETURNING id, event_type, event_timestamp, status, attempt_count, last_error, processed_at, created_at, updated_at`;

export interface markPolarWebhookProcessingArgs {
    id: string;
    eventType: string;
    eventTimestamp: Date;
}

export interface markPolarWebhookProcessingRow {
    id: string;
    eventType: string;
    eventTimestamp: Date;
    status: string;
    attemptCount: number;
    lastError: string | null;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function markPolarWebhookProcessing(sql: Sql, args: markPolarWebhookProcessingArgs): Promise<markPolarWebhookProcessingRow | null> {
    const rows = await sql.unsafe(markPolarWebhookProcessingQuery, [args.id, args.eventType, args.eventTimestamp]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        eventType: row[1],
        eventTimestamp: row[2],
        status: row[3],
        attemptCount: row[4],
        lastError: row[5],
        processedAt: row[6],
        createdAt: row[7],
        updatedAt: row[8]
    };
}

export const markPolarWebhookCompletedQuery = `-- name: markPolarWebhookCompleted :one
UPDATE polar_webhook_receipts
SET status = 'completed',
    last_error = NULL,
    processed_at = now(),
    updated_at = now()
WHERE id = $1
RETURNING id, event_type, event_timestamp, status, attempt_count, last_error, processed_at, created_at, updated_at`;

export interface markPolarWebhookCompletedArgs {
    id: string;
}

export interface markPolarWebhookCompletedRow {
    id: string;
    eventType: string;
    eventTimestamp: Date;
    status: string;
    attemptCount: number;
    lastError: string | null;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function markPolarWebhookCompleted(sql: Sql, args: markPolarWebhookCompletedArgs): Promise<markPolarWebhookCompletedRow | null> {
    const rows = await sql.unsafe(markPolarWebhookCompletedQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        eventType: row[1],
        eventTimestamp: row[2],
        status: row[3],
        attemptCount: row[4],
        lastError: row[5],
        processedAt: row[6],
        createdAt: row[7],
        updatedAt: row[8]
    };
}

export const markPolarWebhookFailedQuery = `-- name: markPolarWebhookFailed :one
INSERT INTO polar_webhook_receipts (
  id,
  event_type,
  event_timestamp,
  status,
  last_error
) VALUES (
  $1,
  $2,
  $3,
  'failed',
  $4
)
ON CONFLICT (id) DO UPDATE
SET event_type = EXCLUDED.event_type,
    event_timestamp = EXCLUDED.event_timestamp,
    status = 'failed',
    attempt_count = polar_webhook_receipts.attempt_count + 1,
    last_error = EXCLUDED.last_error,
    updated_at = now()
RETURNING id, event_type, event_timestamp, status, attempt_count, last_error, processed_at, created_at, updated_at`;

export interface markPolarWebhookFailedArgs {
    id: string;
    eventType: string;
    eventTimestamp: Date;
    lastError: string | null;
}

export interface markPolarWebhookFailedRow {
    id: string;
    eventType: string;
    eventTimestamp: Date;
    status: string;
    attemptCount: number;
    lastError: string | null;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function markPolarWebhookFailed(sql: Sql, args: markPolarWebhookFailedArgs): Promise<markPolarWebhookFailedRow | null> {
    const rows = await sql.unsafe(markPolarWebhookFailedQuery, [args.id, args.eventType, args.eventTimestamp, args.lastError]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        eventType: row[1],
        eventTimestamp: row[2],
        status: row[3],
        attemptCount: row[4],
        lastError: row[5],
        processedAt: row[6],
        createdAt: row[7],
        updatedAt: row[8]
    };
}

