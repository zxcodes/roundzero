import { Sql } from "postgres";

export const listAccountsPendingErasureQuery = `-- name: listAccountsPendingErasure :many
SELECT id
FROM users
WHERE deleted_at IS NOT NULL
  AND deleted_at < now() - interval '30 days'
  AND anonymized_at IS NULL
ORDER BY deleted_at ASC
LIMIT $1::int`;

export interface listAccountsPendingErasureArgs {
    limit: number;
}

export interface listAccountsPendingErasureRow {
    id: string;
}

export async function listAccountsPendingErasure(sql: Sql, args: listAccountsPendingErasureArgs): Promise<listAccountsPendingErasureRow[]> {
    return (await sql.unsafe(listAccountsPendingErasureQuery, [args.limit]).values()).map(row => ({
        id: row[0]
    }));
}

export const getUserErasureStateQuery = `-- name: getUserErasureState :one
SELECT id, deleted_at, anonymized_at
FROM users
WHERE id = $1`;

export interface getUserErasureStateArgs {
    id: string;
}

export interface getUserErasureStateRow {
    id: string;
    deletedAt: Date | null;
    anonymizedAt: Date | null;
}

export async function getUserErasureState(sql: Sql, args: getUserErasureStateArgs): Promise<getUserErasureStateRow | null> {
    const rows = await sql.unsafe(getUserErasureStateQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        deletedAt: row[1],
        anonymizedAt: row[2]
    };
}

export const lockUserErasureStateQuery = `-- name: lockUserErasureState :one
SELECT id, deleted_at, anonymized_at
FROM users
WHERE id = $1
FOR UPDATE`;

export interface lockUserErasureStateArgs {
    id: string;
}

export interface lockUserErasureStateRow {
    id: string;
    deletedAt: Date | null;
    anonymizedAt: Date | null;
}

export async function lockUserErasureState(sql: Sql, args: lockUserErasureStateArgs): Promise<lockUserErasureStateRow | null> {
    const rows = await sql.unsafe(lockUserErasureStateQuery, [args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0],
        deletedAt: row[1],
        anonymizedAt: row[2]
    };
}

export const listResumeKeysForUserQuery = `-- name: listResumeKeysForUser :many
SELECT resume_key AS key
FROM candidate_profiles
WHERE user_id = $1
  AND resume_key IS NOT NULL
UNION
SELECT resume_key AS key
FROM applications
WHERE candidate_id = $1
  AND resume_key IS NOT NULL`;

export interface listResumeKeysForUserArgs {
    userId: string;
}

export interface listResumeKeysForUserRow {
    key: string | null;
}

export async function listResumeKeysForUser(sql: Sql, args: listResumeKeysForUserArgs): Promise<listResumeKeysForUserRow[]> {
    return (await sql.unsafe(listResumeKeysForUserQuery, [args.userId]).values()).map(row => ({
        key: row[0]
    }));
}

export const listVoiceAudioKeysForUserQuery = `-- name: listVoiceAudioKeysForUser :many
SELECT ca.audio_key AS key
FROM communication_assessments ca
JOIN applications a ON a.id = ca.application_id
WHERE a.candidate_id = $1
  AND ca.audio_key IS NOT NULL`;

export interface listVoiceAudioKeysForUserArgs {
    candidateId: string;
}

export interface listVoiceAudioKeysForUserRow {
    key: string | null;
}

export async function listVoiceAudioKeysForUser(sql: Sql, args: listVoiceAudioKeysForUserArgs): Promise<listVoiceAudioKeysForUserRow[]> {
    return (await sql.unsafe(listVoiceAudioKeysForUserQuery, [args.candidateId]).values()).map(row => ({
        key: row[0]
    }));
}

export const scrubCandidateProfileForUserQuery = `-- name: scrubCandidateProfileForUser :exec
UPDATE candidate_profiles
SET resume_key = NULL,
    resume_updated_at = NULL,
    matching_profile = NULL,
    matching_profile_source_hash = NULL,
    matching_profile_version = NULL,
    matching_profile_status = 'pending',
    matching_profile_error = NULL,
    serving_match_generation = NULL,
    serving_match_input_hash = NULL,
    match_feed_status = 'pending',
    match_feed_error = NULL,
    match_feed_refreshed_at = NULL,
    match_alerts_enabled = false,
    match_alerts_enabled_at = NULL,
    match_refresh_token = NULL,
    match_refresh_claimed_at = NULL,
    match_refresh_phase = NULL,
    updated_at = now()
WHERE user_id = $1`;

export interface scrubCandidateProfileForUserArgs {
    userId: string;
}

export async function scrubCandidateProfileForUser(sql: Sql, args: scrubCandidateProfileForUserArgs): Promise<void> {
    await sql.unsafe(scrubCandidateProfileForUserQuery, [args.userId]);
}

export const deleteCandidateJobMatchesForUserQuery = `-- name: deleteCandidateJobMatchesForUser :exec
DELETE FROM candidate_job_matches
WHERE candidate_id = $1`;

export interface deleteCandidateJobMatchesForUserArgs {
    candidateId: string;
}

export async function deleteCandidateJobMatchesForUser(sql: Sql, args: deleteCandidateJobMatchesForUserArgs): Promise<void> {
    await sql.unsafe(deleteCandidateJobMatchesForUserQuery, [args.candidateId]);
}

export const scrubApplicationsForUserQuery = `-- name: scrubApplicationsForUser :exec
UPDATE applications
SET resume_key = NULL,
    metadata = '{}'::jsonb,
    updated_at = now()
WHERE candidate_id = $1`;

export interface scrubApplicationsForUserArgs {
    candidateId: string;
}

export async function scrubApplicationsForUser(sql: Sql, args: scrubApplicationsForUserArgs): Promise<void> {
    await sql.unsafe(scrubApplicationsForUserQuery, [args.candidateId]);
}

export const redactInterviewMessagesForUserQuery = `-- name: redactInterviewMessagesForUser :exec
UPDATE interview_messages im
SET content = '[redacted]'
FROM interviews i
JOIN applications a ON a.id = i.application_id
WHERE im.interview_id = i.id
  AND a.candidate_id = $1`;

export interface redactInterviewMessagesForUserArgs {
    candidateId: string;
}

export async function redactInterviewMessagesForUser(sql: Sql, args: redactInterviewMessagesForUserArgs): Promise<void> {
    await sql.unsafe(redactInterviewMessagesForUserQuery, [args.candidateId]);
}

export const redactInterviewsForUserQuery = `-- name: redactInterviewsForUser :exec
UPDATE interviews i
SET metadata = COALESCE(
      NULLIF(
        jsonb_strip_nulls(
          jsonb_build_object(
            'expiresAt', i.metadata->'expiresAt',
            'jobSnapshot', i.metadata->'jobSnapshot',
            'screeningCoverage', i.metadata->'screeningCoverage',
            'integrity', i.metadata->'integrity'
          )
        ),
        '{}'::jsonb
      ),
      '{}'::jsonb
    ),
    updated_at = now()
FROM applications a
WHERE i.application_id = a.id
  AND a.candidate_id = $1`;

export interface redactInterviewsForUserArgs {
    candidateId: string;
}

export async function redactInterviewsForUser(sql: Sql, args: redactInterviewsForUserArgs): Promise<void> {
    await sql.unsafe(redactInterviewsForUserQuery, [args.candidateId]);
}

export const redactCommunicationAssessmentsForUserQuery = `-- name: redactCommunicationAssessmentsForUser :exec
UPDATE communication_assessments ca
SET transcript = '[]'::jsonb,
    analysis = NULL,
    audio_key = NULL,
    updated_at = now()
FROM applications a
WHERE ca.application_id = a.id
  AND a.candidate_id = $1`;

export interface redactCommunicationAssessmentsForUserArgs {
    candidateId: string;
}

export async function redactCommunicationAssessmentsForUser(sql: Sql, args: redactCommunicationAssessmentsForUserArgs): Promise<void> {
    await sql.unsafe(redactCommunicationAssessmentsForUserQuery, [args.candidateId]);
}

export const redactPreEvaluationsForUserQuery = `-- name: redactPreEvaluationsForUser :exec
UPDATE pre_evaluations pe
SET raw_response = NULL
FROM applications a
WHERE pe.application_id = a.id
  AND a.candidate_id = $1`;

export interface redactPreEvaluationsForUserArgs {
    candidateId: string;
}

export async function redactPreEvaluationsForUser(sql: Sql, args: redactPreEvaluationsForUserArgs): Promise<void> {
    await sql.unsafe(redactPreEvaluationsForUserQuery, [args.candidateId]);
}

export const redactReportsForUserQuery = `-- name: redactReportsForUser :exec
UPDATE reports r
SET summary = '[redacted]',
    strengths = '[]'::jsonb,
    weaknesses = '[]'::jsonb,
    insights = '[]'::jsonb,
    evidence = '[]'::jsonb,
    screening_answers = '[]'::jsonb,
    answer_authenticity = NULL
FROM applications a
WHERE r.application_id = a.id
  AND a.candidate_id = $1`;

export interface redactReportsForUserArgs {
    candidateId: string;
}

export async function redactReportsForUser(sql: Sql, args: redactReportsForUserArgs): Promise<void> {
    await sql.unsafe(redactReportsForUserQuery, [args.candidateId]);
}

export const deleteNotificationsForUserQuery = `-- name: deleteNotificationsForUser :exec
DELETE FROM notifications
WHERE user_id = $1`;

export interface deleteNotificationsForUserArgs {
    userId: string;
}

export async function deleteNotificationsForUser(sql: Sql, args: deleteNotificationsForUserArgs): Promise<void> {
    await sql.unsafe(deleteNotificationsForUserQuery, [args.userId]);
}

export const deleteFeedbackForUserQuery = `-- name: deleteFeedbackForUser :exec
DELETE FROM feedback
WHERE user_id = $1`;

export interface deleteFeedbackForUserArgs {
    userId: string;
}

export async function deleteFeedbackForUser(sql: Sql, args: deleteFeedbackForUserArgs): Promise<void> {
    await sql.unsafe(deleteFeedbackForUserQuery, [args.userId]);
}

export const listOwnedCompanyIdsForUserQuery = `-- name: listOwnedCompanyIdsForUser :many
SELECT id
FROM companies
WHERE owner_id = $1`;

export interface listOwnedCompanyIdsForUserArgs {
    ownerId: string;
}

export interface listOwnedCompanyIdsForUserRow {
    id: string;
}

export async function listOwnedCompanyIdsForUser(sql: Sql, args: listOwnedCompanyIdsForUserArgs): Promise<listOwnedCompanyIdsForUserRow[]> {
    return (await sql.unsafe(listOwnedCompanyIdsForUserQuery, [args.ownerId]).values()).map(row => ({
        id: row[0]
    }));
}

export const countOtherActiveCompanyMembersQuery = `-- name: countOtherActiveCompanyMembers :one
SELECT count(*)::int AS count
FROM company_members
WHERE company_id = $1
  AND user_id != $2
  AND status = 'active'`;

export interface countOtherActiveCompanyMembersArgs {
    companyId: string;
    userId: string;
}

export interface countOtherActiveCompanyMembersRow {
    count: number;
}

export async function countOtherActiveCompanyMembers(sql: Sql, args: countOtherActiveCompanyMembersArgs): Promise<countOtherActiveCompanyMembersRow | null> {
    const rows = await sql.unsafe(countOtherActiveCompanyMembersQuery, [args.companyId, args.userId]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        count: row[0]
    };
}

export const archiveOpenJobsForCompanyQuery = `-- name: archiveOpenJobsForCompany :exec
UPDATE jobs
SET status = 'closed',
    archived_at = now(),
    updated_at = now()
WHERE company_id = $1
  AND status = 'open'
  AND archived_at IS NULL`;

export interface archiveOpenJobsForCompanyArgs {
    companyId: string;
}

export async function archiveOpenJobsForCompany(sql: Sql, args: archiveOpenJobsForCompanyArgs): Promise<void> {
    await sql.unsafe(archiveOpenJobsForCompanyQuery, [args.companyId]);
}

export const anonymizeUserQuery = `-- name: anonymizeUser :one
UPDATE users
SET name = 'Deleted user',
    email = $1::text,
    picture = NULL,
    anonymized_at = now(),
    updated_at = now()
WHERE id = $2
  AND deleted_at IS NOT NULL
  AND anonymized_at IS NULL
RETURNING id`;

export interface anonymizeUserArgs {
    placeholderemail: string;
    id: string;
}

export interface anonymizeUserRow {
    id: string;
}

export async function anonymizeUser(sql: Sql, args: anonymizeUserArgs): Promise<anonymizeUserRow | null> {
    const rows = await sql.unsafe(anonymizeUserQuery, [args.placeholderemail, args.id]).values();
    if (rows.length !== 1) {
        return null;
    }
    const row = rows[0];
    return {
        id: row[0]
    };
}

