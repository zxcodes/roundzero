import { describe, expect, it } from "vitest";
import { ACCOUNT_ERASURE_GRACE_DAYS } from "@/features/accounts/config";
import {
  canRestoreSoftDeletedAccount,
  isEligibleForErasure,
  isPastDeletionGrace,
} from "@/features/accounts/grace";

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describe("account deletion grace", () => {
  it("keeps ACCOUNT_ERASURE_GRACE_DAYS aligned with SQL interval (30)", () => {
    expect(ACCOUNT_ERASURE_GRACE_DAYS).toBe(30);
  });

  it("treats recent deletes as restorable but not erasable", () => {
    const deletedAt = daysAgo(10);
    expect(canRestoreSoftDeletedAccount({ deletedAt, anonymizedAt: null })).toBe(true);
    expect(isEligibleForErasure({ deletedAt, anonymizedAt: null })).toBe(false);
    expect(isPastDeletionGrace(deletedAt)).toBe(false);
  });

  it("treats old deletes as erasable but not restorable", () => {
    const deletedAt = daysAgo(31);
    expect(canRestoreSoftDeletedAccount({ deletedAt, anonymizedAt: null })).toBe(false);
    expect(isEligibleForErasure({ deletedAt, anonymizedAt: null })).toBe(true);
    expect(isPastDeletionGrace(deletedAt)).toBe(true);
  });
});
