import { Sql } from "postgres";

export const createNotificationQuery = `-- name: createNotification :one
INSERT INTO notifications (user_id, type, payload)
VALUES ($1, $2, $3)
RETURNING id, user_id, type, payload, read_at, created_at`;

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
        createdAt: row[5]
    };
}

export const getNotificationsByUserQuery = `-- name: getNotificationsByUser :many
SELECT id, user_id, type, payload, read_at, created_at
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
    createdAt: Date;
}

export async function getNotificationsByUser(sql: Sql, args: getNotificationsByUserArgs): Promise<getNotificationsByUserRow[]> {
    return (await sql.unsafe(getNotificationsByUserQuery, [args.userId, args.limit]).values()).map(row => ({
        id: row[0],
        userId: row[1],
        type: row[2],
        payload: row[3],
        readAt: row[4],
        createdAt: row[5]
    }));
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
RETURNING id, user_id, type, payload, read_at, created_at`;

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
        createdAt: row[5]
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

