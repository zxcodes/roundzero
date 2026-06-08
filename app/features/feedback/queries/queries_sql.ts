import { Sql } from "postgres";

export const createFeedbackQuery = `-- name: createFeedback :one
INSERT INTO feedback (
  user_id,
  role,
  type,
  message
)
VALUES ($1, $2, $3, $4)
RETURNING id, user_id, role, type, message, created_at`;

export interface createFeedbackArgs {
    userId: string;
    role: string;
    type: string;
    message: string;
}

export interface createFeedbackRow {
    id: string;
    userId: string;
    role: string;
    type: string;
    message: string;
    createdAt: Date;
}

export async function createFeedback(sql: Sql, args: createFeedbackArgs): Promise<createFeedbackRow | null> {
    const rows = await sql.unsafe(createFeedbackQuery, [args.userId, args.role, args.type, args.message]).values();
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
        createdAt: row[5]
    };
}

