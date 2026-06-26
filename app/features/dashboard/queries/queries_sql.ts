import { Sql } from "postgres";

export const getReleasedReportsForCompanyDashboardQuery = `-- name: getReleasedReportsForCompanyDashboard :many
SELECT DISTINCT ON (a.id)
  r.id AS report_id,
  r.application_id,
  r.recommendation,
  r.scores,
  r.strengths,
  r.weaknesses,
  r.released_at,
  a.status AS application_status,
  a.job_id,
  j.title AS job_title,
  u.name AS candidate_name,
  pe.confidence AS pre_evaluation_confidence
FROM reports r
JOIN applications a ON a.id = r.application_id
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.candidate_id AND u.deleted_at IS NULL
LEFT JOIN pre_evaluations pe ON pe.application_id = a.id
WHERE j.company_id = $1
  AND j.archived_at IS NULL
  AND r.released_at IS NOT NULL
ORDER BY a.id, r.released_at DESC, r.created_at DESC`;

export interface getReleasedReportsForCompanyDashboardArgs {
    companyId: string;
}

export interface getReleasedReportsForCompanyDashboardRow {
    reportId: string;
    applicationId: string;
    recommendation: string;
    scores: any;
    strengths: any;
    weaknesses: any;
    releasedAt: Date | null;
    applicationStatus: string;
    jobId: string;
    jobTitle: string;
    candidateName: string;
    preEvaluationConfidence: string | null;
}

export async function getReleasedReportsForCompanyDashboard(sql: Sql, args: getReleasedReportsForCompanyDashboardArgs): Promise<getReleasedReportsForCompanyDashboardRow[]> {
    return (await sql.unsafe(getReleasedReportsForCompanyDashboardQuery, [args.companyId]).values()).map(row => ({
        reportId: row[0],
        applicationId: row[1],
        recommendation: row[2],
        scores: row[3],
        strengths: row[4],
        weaknesses: row[5],
        releasedAt: row[6],
        applicationStatus: row[7],
        jobId: row[8],
        jobTitle: row[9],
        candidateName: row[10],
        preEvaluationConfidence: row[11]
    }));
}

