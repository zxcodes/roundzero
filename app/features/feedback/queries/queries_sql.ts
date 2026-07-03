import { Sql } from "postgres";

export const createFeedbackQuery = `-- name: createFeedback :one
INSERT INTO feedback (
  user_id,
  role,
  type,
  message,
  company_id
)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, role, type, message, created_at, company_id`;

export interface createFeedbackArgs {
    userId: string;
    role: string;
    type: string;
    message: string;
    companyId: string | null;
}

export interface createFeedbackRow {
    id: string;
    userId: string;
    role: string;
    type: string;
    message: string;
    createdAt: Date;
    companyId: string | null;
}

export async function createFeedback(sql: Sql, args: createFeedbackArgs): Promise<createFeedbackRow | null> {
    const rows = await sql.unsafe(createFeedbackQuery, [args.userId, args.role, args.type, args.message, args.companyId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        userId: row[1],
        role: row[2],
        type: row[3],
        message: row[4],
        createdAt: row[5],
        companyId: row[6]
    };
}

export const countFeedbackForPlatformAdminQuery = `-- name: countFeedbackForPlatformAdmin :one
SELECT count(*)::int AS total
FROM feedback`;

export interface countFeedbackForPlatformAdminRow {
    total: number;
}

export async function countFeedbackForPlatformAdmin(sql: Sql): Promise<countFeedbackForPlatformAdminRow | null> {
    const rows = await sql.unsafe(countFeedbackForPlatformAdminQuery, []).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        total: row[0]
    };
}

export const listFeedbackForPlatformAdminQuery = `-- name: listFeedbackForPlatformAdmin :many
SELECT
  f.id,
  f.user_id,
  f.role,
  f.type,
  f.message,
  f.created_at,
  u.name AS user_name,
  u.email AS user_email,
  c.name AS company_name,
  c.slug AS company_slug
FROM feedback f
INNER JOIN users u ON u.id = f.user_id
LEFT JOIN companies c ON c.id = f.company_id
ORDER BY f.created_at DESC
LIMIT $2::int
OFFSET $1::int`;

export interface listFeedbackForPlatformAdminArgs {
    offset: number;
    limit: number;
}

export interface listFeedbackForPlatformAdminRow {
    id: string;
    userId: string;
    role: string;
    type: string;
    message: string;
    createdAt: Date;
    userName: string;
    userEmail: string;
    companyName: string | null;
    companySlug: string | null;
}

export async function listFeedbackForPlatformAdmin(sql: Sql, args: listFeedbackForPlatformAdminArgs): Promise<listFeedbackForPlatformAdminRow[]> {
    return (await sql.unsafe(listFeedbackForPlatformAdminQuery, [args.offset, args.limit]).values()).map(row => ({
        id: row[0],
        userId: row[1],
        role: row[2],
        type: row[3],
        message: row[4],
        createdAt: row[5],
        userName: row[6],
        userEmail: row[7],
        companyName: row[8],
        companySlug: row[9]
    }));
}

