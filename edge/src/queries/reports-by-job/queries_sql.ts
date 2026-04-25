import { Sql } from "postgres";

export const countReportsByJobQuery = `-- name: countReportsByJob :one
SELECT count(*)::int AS count
FROM reports r
JOIN applications a ON a.id = r.application_id
WHERE a.job_id = $1`;

export interface countReportsByJobArgs {
    jobId: string;
}

export interface countReportsByJobRow {
    count: number;
}

export async function countReportsByJob(sql: Sql, args: countReportsByJobArgs): Promise<countReportsByJobRow | null> {
    const rows = await sql.unsafe(countReportsByJobQuery, [args.jobId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        count: row[0]
    };
}

