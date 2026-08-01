import type { CompanyMemberRole } from "@/shared/enums";
import { ExpectedError } from "@/shared/expected-error";

/**
 * Company role permissions (MVP):
 * - owner: billing, team, profile, hiring (jobs/applicants/batches)
 * - admin: team, profile, hiring
 * - member: hiring only (read/write jobs and applicant workflows; no billing/profile/team)
 *
 * `companies.owner_id` is a denormalized billing/cache field. Canonical owner is
 * `company_members.role = 'owner'`; always update both via `transferOwnership`.
 */
export const assertCanManageTeam = (role: string) => {
  if (role !== "owner" && role !== "admin") {
    throw new ExpectedError("forbidden", "Not authorized to manage team members");
  }
};

export const assertCanManageCompanyProfile = (role: string) => {
  if (role !== "owner" && role !== "admin") {
    throw new ExpectedError("forbidden", "Not authorized to update company profile");
  }
};

export const assertCompanyOwner = (role: string) => {
  if (role !== "owner") {
    throw new ExpectedError("forbidden", "Only the company owner can manage billing");
  }
};

export const parseCompanyMemberRole = (
  role: string | null | undefined,
): CompanyMemberRole | null => {
  if (role === "owner" || role === "admin" || role === "member") {
    return role;
  }
  return null;
};
