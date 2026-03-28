import { Sql } from "postgres";

export const upsertUserByGoogleIdQuery = `-- name: upsertUserByGoogleId :one
INSERT INTO users (email, name, picture, google_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (google_id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      picture = EXCLUDED.picture,
      updated_at = now()
RETURNING id, email, name, picture, role, google_id, created_at, updated_at`;

export interface upsertUserByGoogleIdArgs {
    email: string;
    name: string;
    picture: string | null;
    googleId: string | null;
}

export interface upsertUserByGoogleIdRow {
    id: string;
    email: string;
    name: string;
    picture: string | null;
    role: string | null;
    googleId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function upsertUserByGoogleId(sql: Sql, args: upsertUserByGoogleIdArgs): Promise<upsertUserByGoogleIdRow | null> {
    const rows = await sql.unsafe(upsertUserByGoogleIdQuery, [args.email, args.name, args.picture, args.googleId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        email: row[1],
        name: row[2],
        picture: row[3],
        role: row[4],
        googleId: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

export const getUserByIdQuery = `-- name: getUserById :one
SELECT id, email, name, picture, role, google_id, created_at, updated_at
FROM users
WHERE id = $1`;

export interface getUserByIdArgs {
    id: string;
}

export interface getUserByIdRow {
    id: string;
    email: string;
    name: string;
    picture: string | null;
    role: string | null;
    googleId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getUserById(sql: Sql, args: getUserByIdArgs): Promise<getUserByIdRow | null> {
    const rows = await sql.unsafe(getUserByIdQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        email: row[1],
        name: row[2],
        picture: row[3],
        role: row[4],
        googleId: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

export const setUserRoleQuery = `-- name: setUserRole :one
UPDATE users
SET role = $1,
    updated_at = now()
WHERE id = $2
  AND role IS NULL
RETURNING id, email, name, picture, role, google_id, created_at, updated_at`;

export interface setUserRoleArgs {
    role: string | null;
    id: string;
}

export interface setUserRoleRow {
    id: string;
    email: string;
    name: string;
    picture: string | null;
    role: string | null;
    googleId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function setUserRole(sql: Sql, args: setUserRoleArgs): Promise<setUserRoleRow | null> {
    const rows = await sql.unsafe(setUserRoleQuery, [args.role, args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        email: row[1],
        name: row[2],
        picture: row[3],
        role: row[4],
        googleId: row[5],
        createdAt: row[6],
        updatedAt: row[7]
    };
}

