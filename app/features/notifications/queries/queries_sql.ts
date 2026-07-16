import { Sql } from "postgres";

export const createNotificationQuery = `-- name: createNotification :one
INSERT INTO notifications (user_id, type, payload)
VALUES ($1, $2, $3)
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at`;

export interface createNotificationArgs {
    userId: string;
    type: string;
    payload: any;
}

export interface createNotificationRow {
    id: string;
    userId: string;
    type: string;
    payload: any;
    readAt: Date | null;
    emailDeliveryStatus: string | null;
    emailDeliveryError: string | null;
    emailDeliveryAttemptedAt: Date | null;
    emailDeliverySentAt: Date | null;
    emailProviderMessageId: string | null;
    createdAt: Date;
}

export async function createNotification(sql: Sql, args: createNotificationArgs): Promise<createNotificationRow | null> {
    const rows = await sql.unsafe(createNotificationQuery, [args.userId, args.type, args.payload]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        readAt: row[4],
        emailDeliveryStatus: row[5],
        emailDeliveryError: row[6],
        emailDeliveryAttemptedAt: row[7],
        emailDeliverySentAt: row[8],
        emailProviderMessageId: row[9],
        createdAt: row[10]
    };
}

export const createDedupedNotificationQuery = `-- name: createDedupedNotification :one
INSERT INTO notifications (user_id, type, payload, dedupe_key)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, type, dedupe_key) WHERE dedupe_key IS NOT NULL
DO UPDATE SET dedupe_key = EXCLUDED.dedupe_key
RETURNING id, user_id, type, payload, dedupe_key, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at`;

export interface createDedupedNotificationArgs {
    userId: string;
    type: string;
    payload: any;
    dedupeKey: string | null;
}

export interface createDedupedNotificationRow {
    id: string;
    userId: string;
    type: string;
    payload: any;
    dedupeKey: string | null;
    readAt: Date | null;
    emailDeliveryStatus: string | null;
    emailDeliveryError: string | null;
    emailDeliveryAttemptedAt: Date | null;
    emailDeliverySentAt: Date | null;
    emailProviderMessageId: string | null;
    createdAt: Date;
}

export async function createDedupedNotification(sql: Sql, args: createDedupedNotificationArgs): Promise<createDedupedNotificationRow | null> {
    const rows = await sql.unsafe(createDedupedNotificationQuery, [args.userId, args.type, args.payload, args.dedupeKey]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        dedupeKey: row[4],
        readAt: row[5],
        emailDeliveryStatus: row[6],
        emailDeliveryError: row[7],
        emailDeliveryAttemptedAt: row[8],
        emailDeliverySentAt: row[9],
        emailProviderMessageId: row[10],
        createdAt: row[11]
    };
}

export const getNotificationsByUserQuery = `-- name: getNotificationsByUser :many
SELECT id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at
FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2`;

export interface getNotificationsByUserArgs {
    userId: string;
    limit: string;
}

export interface getNotificationsByUserRow {
    id: string;
    userId: string;
    type: string;
    payload: any;
    readAt: Date | null;
    emailDeliveryStatus: string | null;
    emailDeliveryError: string | null;
    emailDeliveryAttemptedAt: Date | null;
    emailDeliverySentAt: Date | null;
    emailProviderMessageId: string | null;
    createdAt: Date;
}

export async function getNotificationsByUser(sql: Sql, args: getNotificationsByUserArgs): Promise<getNotificationsByUserRow[]> {
    return (await sql.unsafe(getNotificationsByUserQuery, [args.userId, args.limit]).values()).map(row => ({
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        readAt: row[4],
        emailDeliveryStatus: row[5],
        emailDeliveryError: row[6],
        emailDeliveryAttemptedAt: row[7],
        emailDeliverySentAt: row[8],
        emailProviderMessageId: row[9],
        createdAt: row[10]
    }));
}

export const getNotificationByIdQuery = `-- name: getNotificationById :one
SELECT id, user_id, type, payload, dedupe_key, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at
FROM notifications
WHERE id = $1`;

export interface getNotificationByIdArgs {
    id: string;
}

export interface getNotificationByIdRow {
    id: string;
    userId: string;
    type: string;
    payload: any;
    dedupeKey: string | null;
    readAt: Date | null;
    emailDeliveryStatus: string | null;
    emailDeliveryError: string | null;
    emailDeliveryAttemptedAt: Date | null;
    emailDeliverySentAt: Date | null;
    emailProviderMessageId: string | null;
    createdAt: Date;
}

export async function getNotificationById(sql: Sql, args: getNotificationByIdArgs): Promise<getNotificationByIdRow | null> {
    const rows = await sql.unsafe(getNotificationByIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        dedupeKey: row[4],
        readAt: row[5],
        emailDeliveryStatus: row[6],
        emailDeliveryError: row[7],
        emailDeliveryAttemptedAt: row[8],
        emailDeliverySentAt: row[9],
        emailProviderMessageId: row[10],
        createdAt: row[11]
    };
}

export const countUnreadNotificationsByUserQuery = `-- name: countUnreadNotificationsByUser :one
SELECT count(*)::int AS unread_count
FROM notifications
WHERE user_id = $1
  AND read_at IS NULL`;

export interface countUnreadNotificationsByUserArgs {
    userId: string;
}

export interface countUnreadNotificationsByUserRow {
    unreadCount: number;
}

export async function countUnreadNotificationsByUser(sql: Sql, args: countUnreadNotificationsByUserArgs): Promise<countUnreadNotificationsByUserRow | null> {
    const rows = await sql.unsafe(countUnreadNotificationsByUserQuery, [args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        unreadCount: row[0]
    };
}

export const markNotificationReadByUserQuery = `-- name: markNotificationReadByUser :one
UPDATE notifications
SET read_at = COALESCE(read_at, now())
WHERE id = $1
  AND user_id = $2
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at`;

export interface markNotificationReadByUserArgs {
    id: string;
    userId: string;
}

export interface markNotificationReadByUserRow {
    id: string;
    userId: string;
    type: string;
    payload: any;
    readAt: Date | null;
    emailDeliveryStatus: string | null;
    emailDeliveryError: string | null;
    emailDeliveryAttemptedAt: Date | null;
    emailDeliverySentAt: Date | null;
    emailProviderMessageId: string | null;
    createdAt: Date;
}

export async function markNotificationReadByUser(sql: Sql, args: markNotificationReadByUserArgs): Promise<markNotificationReadByUserRow | null> {
    const rows = await sql.unsafe(markNotificationReadByUserQuery, [args.id, args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        readAt: row[4],
        emailDeliveryStatus: row[5],
        emailDeliveryError: row[6],
        emailDeliveryAttemptedAt: row[7],
        emailDeliverySentAt: row[8],
        emailProviderMessageId: row[9],
        createdAt: row[10]
    };
}

export const markAllNotificationsReadByUserQuery = `-- name: markAllNotificationsReadByUser :exec
UPDATE notifications
SET read_at = now()
WHERE user_id = $1
  AND read_at IS NULL`;

export interface markAllNotificationsReadByUserArgs {
    userId: string;
}

export async function markAllNotificationsReadByUser(sql: Sql, args: markAllNotificationsReadByUserArgs): Promise<void> {
    await sql.unsafe(markAllNotificationsReadByUserQuery, [args.userId]);
}

export const markNotificationEmailDeliveredQuery = `-- name: markNotificationEmailDelivered :one
UPDATE notifications
SET email_delivery_status = 'sent',
    email_delivery_error = NULL,
    email_delivery_attempted_at = now(),
    email_delivery_sent_at = now(),
    email_provider_message_id = $2
WHERE id = $1
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at`;

export interface markNotificationEmailDeliveredArgs {
    id: string;
    providerMessageId: string | null;
}

export interface markNotificationEmailDeliveredRow {
    id: string;
    userId: string;
    type: string;
    payload: any;
    readAt: Date | null;
    emailDeliveryStatus: string | null;
    emailDeliveryError: string | null;
    emailDeliveryAttemptedAt: Date | null;
    emailDeliverySentAt: Date | null;
    emailProviderMessageId: string | null;
    createdAt: Date;
}

export async function markNotificationEmailDelivered(sql: Sql, args: markNotificationEmailDeliveredArgs): Promise<markNotificationEmailDeliveredRow | null> {
    const rows = await sql.unsafe(markNotificationEmailDeliveredQuery, [args.id, args.providerMessageId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        readAt: row[4],
        emailDeliveryStatus: row[5],
        emailDeliveryError: row[6],
        emailDeliveryAttemptedAt: row[7],
        emailDeliverySentAt: row[8],
        emailProviderMessageId: row[9],
        createdAt: row[10]
    };
}

export const markNotificationEmailFailedQuery = `-- name: markNotificationEmailFailed :one
UPDATE notifications
SET email_delivery_status = 'failed',
    email_delivery_error = $2,
    email_delivery_attempted_at = now(),
    email_delivery_sent_at = NULL,
    email_provider_message_id = NULL
WHERE id = $1
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at`;

export interface markNotificationEmailFailedArgs {
    id: string;
    errorMessage: string | null;
}

export interface markNotificationEmailFailedRow {
    id: string;
    userId: string;
    type: string;
    payload: any;
    readAt: Date | null;
    emailDeliveryStatus: string | null;
    emailDeliveryError: string | null;
    emailDeliveryAttemptedAt: Date | null;
    emailDeliverySentAt: Date | null;
    emailProviderMessageId: string | null;
    createdAt: Date;
}

export async function markNotificationEmailFailed(sql: Sql, args: markNotificationEmailFailedArgs): Promise<markNotificationEmailFailedRow | null> {
    const rows = await sql.unsafe(markNotificationEmailFailedQuery, [args.id, args.errorMessage]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        readAt: row[4],
        emailDeliveryStatus: row[5],
        emailDeliveryError: row[6],
        emailDeliveryAttemptedAt: row[7],
        emailDeliverySentAt: row[8],
        emailProviderMessageId: row[9],
        createdAt: row[10]
    };
}

export const markNotificationEmailSkippedQuery = `-- name: markNotificationEmailSkipped :one
UPDATE notifications
SET email_delivery_status = 'skipped',
    email_delivery_error = $2,
    email_delivery_attempted_at = now(),
    email_delivery_sent_at = NULL,
    email_provider_message_id = NULL
WHERE id = $1
RETURNING id, user_id, type, payload, read_at, email_delivery_status, email_delivery_error, email_delivery_attempted_at, email_delivery_sent_at, email_provider_message_id, created_at`;

export interface markNotificationEmailSkippedArgs {
    id: string;
    reason: string | null;
}

export interface markNotificationEmailSkippedRow {
    id: string;
    userId: string;
    type: string;
    payload: any;
    readAt: Date | null;
    emailDeliveryStatus: string | null;
    emailDeliveryError: string | null;
    emailDeliveryAttemptedAt: Date | null;
    emailDeliverySentAt: Date | null;
    emailProviderMessageId: string | null;
    createdAt: Date;
}

export async function markNotificationEmailSkipped(sql: Sql, args: markNotificationEmailSkippedArgs): Promise<markNotificationEmailSkippedRow | null> {
    const rows = await sql.unsafe(markNotificationEmailSkippedQuery, [args.id, args.reason]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        readAt: row[4],
        emailDeliveryStatus: row[5],
        emailDeliveryError: row[6],
        emailDeliveryAttemptedAt: row[7],
        emailDeliverySentAt: row[8],
        emailProviderMessageId: row[9],
        createdAt: row[10]
    };
}

