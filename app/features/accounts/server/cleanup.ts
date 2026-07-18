import type { Sql } from "postgres";

import { isEligibleForErasure } from "@/features/accounts/grace";
import {
  anonymizeUser,
  archiveOpenJobsForCompany,
  countOtherActiveCompanyMembers,
  deleteFeedbackForUser,
  deleteNotificationsForUser,
  getUserErasureState,
  listOwnedCompanyIdsForUser,
  listResumeKeysForUser,
  listVoiceAudioKeysForUser,
  lockUserErasureState,
  redactCommunicationAssessmentsForUser,
  redactInterviewMessagesForUser,
  redactInterviewsForUser,
  redactPreEvaluationsForUser,
  redactReportsForUser,
  scrubApplicationsForUser,
  scrubCandidateProfileForUser,
} from "@/features/accounts/queries/queries_sql";
import { asSqlTransaction } from "@/shared/db-transaction";

function deletedUserEmail(userId: string): string {
  return `deleted+${userId}@deleted.invalid`;
}

async function deleteR2Objects(resumes: R2Bucket, keys: Array<string | null>): Promise<void> {
  const uniqueKeys = [...new Set(keys.filter((key): key is string => Boolean(key)))];
  for (const key of uniqueKeys) {
    await resumes.delete(key);
  }
}

async function scrubUserDataInTransaction(tx: Sql, userId: string): Promise<boolean> {
  await scrubCandidateProfileForUser(tx, { userId });
  await scrubApplicationsForUser(tx, { candidateId: userId });
  await redactInterviewsForUser(tx, { candidateId: userId });
  await redactInterviewMessagesForUser(tx, { candidateId: userId });
  await redactCommunicationAssessmentsForUser(tx, { candidateId: userId });
  await redactPreEvaluationsForUser(tx, { candidateId: userId });
  await redactReportsForUser(tx, { candidateId: userId });
  await deleteNotificationsForUser(tx, { userId });
  await deleteFeedbackForUser(tx, { userId });

  const ownedCompanyIds = await listOwnedCompanyIdsForUser(tx, { ownerId: userId });
  for (const company of ownedCompanyIds) {
    const members = await countOtherActiveCompanyMembers(tx, {
      companyId: company.id,
      userId,
    });
    if ((members?.count ?? 0) === 0) {
      await archiveOpenJobsForCompany(tx, { companyId: company.id });
    }
  }

  const anonymized = await anonymizeUser(tx, {
    id: userId,
    placeholderemail: deletedUserEmail(userId),
  });

  return anonymized !== null;
}

/**
 * Irreversibly anonymize a soft-deleted user past the grace period.
 * Idempotent: no-op when the user is missing, not deleted, in grace, or already anonymized.
 */
export async function eraseDeletedAccount(
  db: Sql,
  resumes: R2Bucket,
  userId: string,
): Promise<{ erased: boolean }> {
  const initial = await getUserErasureState(db, { id: userId });
  if (!isEligibleForErasure(initial)) {
    return { erased: false };
  }

  const [resumeKeys, audioKeys] = await Promise.all([
    listResumeKeysForUser(db, { userId }),
    listVoiceAudioKeysForUser(db, { candidateId: userId }),
  ]);
  const r2Keys = [...resumeKeys.map((row) => row.key), ...audioKeys.map((row) => row.key)];

  await deleteR2Objects(resumes, r2Keys);

  const erased = await db.begin(async (tx) => {
    const transaction = asSqlTransaction(tx);
    const locked = await lockUserErasureState(transaction, { id: userId });
    if (!isEligibleForErasure(locked)) {
      return false;
    }

    return await scrubUserDataInTransaction(transaction, userId);
  });

  return { erased };
}
