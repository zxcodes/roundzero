import { ACCOUNT_ERASURE_GRACE_DAYS } from "@/features/accounts/config";

export type AccountDeletionState = {
  deletedAt: Date | null;
  anonymizedAt: Date | null;
};

export function isPastDeletionGrace(deletedAt: Date): boolean {
  const graceEndMs = deletedAt.getTime() + ACCOUNT_ERASURE_GRACE_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() >= graceEndMs;
}

/** Soft-deleted user still inside the UI restore window. */
export function canRestoreSoftDeletedAccount(state: AccountDeletionState): boolean {
  if (!state.deletedAt || state.anonymizedAt) {
    return false;
  }

  return !isPastDeletionGrace(state.deletedAt);
}

/** Soft-deleted user past grace, ready for irreversible erasure. */
export function isEligibleForErasure(state: AccountDeletionState | null | undefined): boolean {
  if (!state?.deletedAt || state.anonymizedAt) {
    return false;
  }

  return isPastDeletionGrace(state.deletedAt);
}

export function assertAccountCanAuthenticate(state: AccountDeletionState): void {
  if (state.anonymizedAt) {
    throw new Error("This account has been permanently deleted");
  }

  if (state.deletedAt && isPastDeletionGrace(state.deletedAt)) {
    throw new Error("This account has been permanently deleted");
  }
}
