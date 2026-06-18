import { describe, expect, it } from "vitest";
import { getUserByEmail, getUserById } from "@/features/auth/queries/queries_sql";
import {
  createCompanyMember,
  createInvitation,
  getActiveMemberByCompanyEmail,
  getActiveMembershipByUserId,
  getCompanyByMemberUserId,
  getInvitationByToken,
  getMembershipByCompanyAndUser,
  getMembershipById,
  getPendingInvitationByEmail,
  listActiveMembersByCompany,
  markInvitationAccepted,
  reactivateCompanyMember,
  removeCompanyMember,
  revokeExpiredInvitationsByEmail,
  revokeInvitation as revokeInvitationQuery,
  updateCompanyMemberRole,
  updateCompanyOwner,
} from "@/features/companies/queries/membership-queries_sql";
import { getCompanyById } from "@/features/companies/queries/queries_sql";
import {
  enforceCompanyEntitlement,
  lockCompanyEntitlementScope,
  readCompanyEntitlements,
} from "@/features/entitlements/server/enforcement";
import { getTestDb, seedCompany, seedUser } from "@/shared/__tests__/test-utils";
import { asSqlTransaction } from "@/shared/db-transaction";
import { emailsMatch } from "@/shared/google-userinfo";
import { assertCanManageTeam, assertCompanyOwner } from "@/shared/membership-auth";
import { isUniqueViolation } from "@/shared/postgres-errors";

const sql = getTestDb();

const inviteExpiry = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

/** Mirrors the membership transaction inside `acceptInvite` for workflow tests. */
const simulateAcceptInvite = async ({ userId, token }: { userId: string; token: string }) => {
  try {
    await sql.begin(async (tx) => {
      const transaction = asSqlTransaction(tx);

      const freshInvitation = await getInvitationByToken(transaction, { token });
      if (!freshInvitation || freshInvitation.acceptedAt || freshInvitation.revokedAt) {
        throw new Error("Invitation not found or no longer valid");
      }
      if (freshInvitation.expiresAt.getTime() <= Date.now()) {
        throw new Error("This invitation has expired");
      }

      const existingMembership = await getActiveMembershipByUserId(transaction, {
        userId,
      });
      if (existingMembership) {
        throw new Error("You already belong to a company");
      }

      const company = await getCompanyById(transaction, { id: freshInvitation.companyId });
      if (!company) {
        throw new Error("Company not found");
      }

      await lockCompanyEntitlementScope(transaction, company.id);
      await enforceCompanyEntitlement(transaction, company.id, "team.accept");

      const priorMembership = await getMembershipByCompanyAndUser(transaction, {
        companyId: freshInvitation.companyId,
        userId,
      });

      if (priorMembership?.status === "removed") {
        const reactivated = await reactivateCompanyMember(transaction, {
          role: freshInvitation.role,
          invitedBy: freshInvitation.invitedBy,
          companyId: freshInvitation.companyId,
          userId,
        });
        if (!reactivated) {
          throw new Error("Failed to rejoin company");
        }
      } else if (priorMembership) {
        throw new Error("You already belong to a company");
      } else {
        await createCompanyMember(transaction, {
          companyId: freshInvitation.companyId,
          userId,
          role: freshInvitation.role,
          invitedBy: freshInvitation.invitedBy,
        });
      }

      const accepted = await markInvitationAccepted(transaction, { id: freshInvitation.id });
      if (!accepted) {
        throw new Error("Invitation not found or no longer valid");
      }
    });
    return { ok: true as const };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false as const, error: "You already belong to a company" };
    }
    if (error instanceof Error) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
};

const createPendingInvite = async ({
  companyId,
  ownerId,
  email,
  role,
  token,
  expiresAt = inviteExpiry(),
}: {
  companyId: string;
  ownerId: string;
  email: string;
  role: "admin" | "member";
  token: string;
  expiresAt?: Date;
}) => {
  const invitation = await createInvitation(sql, {
    companyId,
    email,
    role,
    token,
    invitedBy: ownerId,
    expiresAt,
  });
  expect(invitation).not.toBeNull();
  return invitation!;
};

// ─── Accept invite workflows ────────────────────────────────────

describe("accept invite workflows", () => {
  it("new user accepts invitation and becomes an active member", async () => {
    const { company, owner } = await seedCompany();
    const invitee = await seedUser({ role: "company", email: "new-member@acme.com" });

    await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: "new-member@acme.com",
      role: "admin",
      token: "accept-new-member",
    });

    const result = await simulateAcceptInvite({
      userId: invitee.id,
      token: "accept-new-member",
    });
    expect(result).toEqual({ ok: true });

    const membership = await getActiveMembershipByUserId(sql, { userId: invitee.id });
    expect(membership).not.toBeNull();
    expect(membership!.companyId).toBe(company.id);
    expect(membership!.role).toBe("admin");

    const invitation = await getInvitationByToken(sql, { token: "accept-new-member" });
    expect(invitation!.acceptedAt).not.toBeNull();
    expect(await getCompanyByMemberUserId(sql, { userId: invitee.id })).not.toBeNull();
  });

  it("removed member accepts re-invitation via reactivation (not a new row)", async () => {
    const { company, owner } = await seedCompany();
    const member = await seedUser({ role: "company", email: "returning@acme.com" });

    const original = await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });

    await removeCompanyMember(sql, {
      id: original!.id,
      companyId: company.id,
    });

    await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: "returning@acme.com",
      role: "admin",
      token: "reinvite-token",
    });

    const result = await simulateAcceptInvite({
      userId: member.id,
      token: "reinvite-token",
    });
    expect(result).toEqual({ ok: true });

    const rows = await sql`
      SELECT id, role, status
      FROM company_members
      WHERE company_id = ${company.id}
        AND user_id = ${member.id}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(original!.id);
    expect(rows[0]!.status).toBe("active");
    expect(rows[0]!.role).toBe("admin");
  });

  it("naive insert after removal violates company_id+user_id unique constraint", async () => {
    const { company } = await seedCompany();
    const member = await seedUser({ role: "company" });

    const original = await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: null,
    });
    await removeCompanyMember(sql, {
      id: original!.id,
      companyId: company.id,
    });

    await expect(
      createCompanyMember(sql, {
        companyId: company.id,
        userId: member.id,
        role: "member",
        invitedBy: null,
      }),
    ).rejects.toSatisfy((error: unknown) => isUniqueViolation(error));
  });

  it("rejects accept when user already belongs to another company", async () => {
    const { company: companyA } = await seedCompany({ name: "Company A" });
    const { company: companyB, owner: ownerB } = await seedCompany({ name: "Company B" });
    const member = await seedUser({ role: "company", email: "busy@acme.com" });

    await createCompanyMember(sql, {
      companyId: companyA.id,
      userId: member.id,
      role: "member",
      invitedBy: null,
    });

    await createPendingInvite({
      companyId: companyB.id,
      ownerId: ownerB.id,
      email: "busy@acme.com",
      role: "member",
      token: "other-company-token",
    });

    const result = await simulateAcceptInvite({
      userId: member.id,
      token: "other-company-token",
    });
    expect(result).toEqual({ ok: false, error: "You already belong to a company" });
  });

  it("rejects accept for revoked invitation", async () => {
    const { company, owner } = await seedCompany();
    const invitee = await seedUser({ role: "company", email: "revoked@acme.com" });

    const invitation = await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: "revoked@acme.com",
      role: "member",
      token: "revoked-token",
    });

    await revokeInvitationQuery(sql, {
      id: invitation.id,
      companyId: company.id,
    });

    const result = await simulateAcceptInvite({
      userId: invitee.id,
      token: "revoked-token",
    });
    expect(result).toEqual({ ok: false, error: "Invitation not found or no longer valid" });
    expect(await getActiveMembershipByUserId(sql, { userId: invitee.id })).toBeNull();
  });

  it("rejects accept for expired invitation", async () => {
    const { company, owner } = await seedCompany();
    const invitee = await seedUser({ role: "company", email: "expired@acme.com" });

    await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: "expired@acme.com",
      role: "member",
      token: "expired-token",
      expiresAt: new Date(Date.now() - 60_000),
    });

    const result = await simulateAcceptInvite({
      userId: invitee.id,
      token: "expired-token",
    });
    expect(result).toEqual({ ok: false, error: "This invitation has expired" });
  });

  it("rejects double accept (race on markInvitationAccepted)", async () => {
    const { company, owner } = await seedCompany();
    const invitee = await seedUser({ role: "company", email: "race@acme.com" });

    const invitation = await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: "race@acme.com",
      role: "member",
      token: "race-token",
    });

    const first = await simulateAcceptInvite({ userId: invitee.id, token: "race-token" });
    expect(first).toEqual({ ok: true });

    const second = await simulateAcceptInvite({ userId: invitee.id, token: "race-token" });
    expect(second).toEqual({ ok: false, error: "Invitation not found or no longer valid" });

    const accepted = await markInvitationAccepted(sql, { id: invitation.id });
    expect(accepted).toBeNull();
  });

  it("rejects accept when user is already an active member of the same company", async () => {
    const { company, owner } = await seedCompany();
    const member = await seedUser({ role: "company", email: "already-in@acme.com" });

    await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });

    await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: "already-in@acme.com",
      role: "admin",
      token: "duplicate-accept",
    });

    const result = await simulateAcceptInvite({
      userId: member.id,
      token: "duplicate-accept",
    });
    expect(result).toEqual({ ok: false, error: "You already belong to a company" });
  });
});

// ─── Invite eligibility (mirrors inviteMember guards) ───────────

describe("invite eligibility guards", () => {
  it("blocks invite when email is already an active member", async () => {
    const { company, owner } = await seedCompany();
    const member = await seedUser({ role: "company", email: "member@acme.com" });

    await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });

    const existing = await getActiveMemberByCompanyEmail(sql, {
      companyId: company.id,
      email: "member@acme.com",
    });
    expect(existing).not.toBeNull();
  });

  it("blocks invite when a non-expired pending invitation exists", async () => {
    const { company, owner } = await seedCompany();

    await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: "pending@acme.com",
      role: "member",
      token: "pending-token",
    });

    const pending = await getPendingInvitationByEmail(sql, {
      companyId: company.id,
      email: "pending@acme.com",
    });
    expect(pending).not.toBeNull();
  });

  it("allows re-invite after prior invitation expired", async () => {
    const { company, owner } = await seedCompany();

    await createInvitation(sql, {
      companyId: company.id,
      email: "expired-pending@acme.com",
      role: "member",
      token: "old-expired",
      invitedBy: owner.id,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const stale = await getPendingInvitationByEmail(sql, {
      companyId: company.id,
      email: "expired-pending@acme.com",
    });
    expect(stale).toBeNull();

    await revokeExpiredInvitationsByEmail(sql, {
      companyId: company.id,
      email: "expired-pending@acme.com",
    });

    const fresh = await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: "expired-pending@acme.com",
      role: "admin",
      token: "fresh-after-expired",
    });
    expect(fresh.email).toBe("expired-pending@acme.com");
  });

  it("blocks invite when existing user belongs to another company", async () => {
    const { company: companyA } = await seedCompany({ name: "Alpha" });
    const { company: companyB } = await seedCompany({ name: "Beta" });
    const user = await seedUser({ role: "company", email: "elsewhere@acme.com" });

    await createCompanyMember(sql, {
      companyId: companyA.id,
      userId: user.id,
      role: "member",
      invitedBy: null,
    });

    const membership = await getActiveMembershipByUserId(sql, { userId: user.id });
    expect(membership!.companyId).toBe(companyA.id);

    const blocked = await getActiveMemberByCompanyEmail(sql, {
      companyId: companyB.id,
      email: "elsewhere@acme.com",
    });
    expect(blocked).toBeNull();

    const otherMembership = await getActiveMembershipByUserId(sql, { userId: user.id });
    expect(otherMembership).not.toBeNull();
  });

  it("matches invite emails case-insensitively", () => {
    expect(emailsMatch("Teammate@Acme.COM", "teammate@acme.com")).toBe(true);
  });

  it("allows invite on free when only the owner is present", async () => {
    const { company } = await seedCompany();
    const companyRow = await getCompanyById(sql, { id: company.id });
    if (!companyRow) throw new Error("Company not found");

    const entitlements = await readCompanyEntitlements(sql, companyRow.id);
    expect(entitlements.team.canInviteAnother).toBe(true);
  });

  it("blocks invite when the plan team seat limit is reached", async () => {
    const { company, owner } = await seedCompany();
    const companyRow = await getCompanyById(sql, { id: company.id });
    if (!companyRow) throw new Error("Company not found");

    const member = await seedUser({ role: "company", email: "filled-seat@acme.com" });
    await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });

    const entitlements = await readCompanyEntitlements(sql, companyRow.id);
    expect(entitlements.team.canInviteAnother).toBe(false);

    await expect(enforceCompanyEntitlement(sql, companyRow.id, "team.invite")).rejects.toThrow(
      "Your plan includes 1 team member",
    );
  });

  it("counts pending invitations toward the team seat limit", async () => {
    const { company, owner } = await seedCompany();

    await sql`
      UPDATE companies
      SET subscription_plan = 'starter', subscription_status = 'active'
      WHERE id = ${company.id}
    `;

    const member = await seedUser({ role: "company", email: "starter-member@acme.com" });
    await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });

    await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: "fills-seat@acme.com",
      role: "member",
      token: "fills-seat-token",
    });

    const entitlements = await readCompanyEntitlements(sql, company.id);
    expect(entitlements.team.members.used).toBe(1);
    expect(entitlements.team.pendingInvites.used).toBe(1);
    expect(entitlements.team.slotsUsed).toBe(2);
    expect(entitlements.team.members.remaining).toBe(0);
    expect(entitlements.team.canInviteAnother).toBe(false);
  });

  it("does not count the owner toward invited member usage", async () => {
    const { company } = await seedCompany();

    const counts = await readCompanyEntitlements(sql, company.id);
    expect(counts.team.members.used).toBe(0);
    expect(counts.team.slotsUsed).toBe(0);
  });

  it("blocks accept when the team member limit is already reached", async () => {
    const { company, owner } = await seedCompany();
    const filled = await seedUser({ role: "company", email: "filled@acme.com" });
    await createCompanyMember(sql, {
      companyId: company.id,
      userId: filled.id,
      role: "member",
      invitedBy: owner.id,
    });

    const invitee = await seedUser({ role: "company", email: "late-joiner@acme.com" });
    await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: invitee.email,
      role: "member",
      token: "late-joiner-token",
    });

    const result = await simulateAcceptInvite({
      userId: invitee.id,
      token: "late-joiner-token",
    });

    expect(result).toEqual({
      ok: false,
      error: "This team has reached its member limit. Ask the owner to upgrade the plan.",
    });
  });

  it("allows accept when a pending invite still has capacity", async () => {
    const { company, owner } = await seedCompany();
    const invitee = await seedUser({ role: "company", email: "welcome@acme.com" });

    await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: invitee.email,
      role: "member",
      token: "welcome-token",
    });

    const result = await simulateAcceptInvite({
      userId: invitee.id,
      token: "welcome-token",
    });

    expect(result).toEqual({ ok: true });
  });
});

// ─── Leave and remove workflows ─────────────────────────────────

describe("leave and remove workflows", () => {
  it("removal clears active membership but keeps the user's global role", async () => {
    const { company } = await seedCompany();
    const member = await seedUser({ role: "company" });

    const membership = await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: null,
    });

    const removed = await removeCompanyMember(sql, {
      id: membership!.id,
      companyId: company.id,
    });
    expect(removed).not.toBeNull();

    // No active membership, but the global `company` role is intentionally
    // retained so the user lands on /onboarding/no-workspace (not an orphan
    // null-role session) and can be reactivated via re-invite.
    expect(await getActiveMembershipByUserId(sql, { userId: member.id })).toBeNull();
    const user = await getUserById(sql, { id: member.id });
    expect(user!.role).toBe("company");
  });

  it("removed member can rejoin after leave via new invitation", async () => {
    const { company, owner } = await seedCompany();
    const member = await seedUser({ role: "company", email: "left-then-back@acme.com" });

    const membership = await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });

    await removeCompanyMember(sql, { id: membership!.id, companyId: company.id });

    await createPendingInvite({
      companyId: company.id,
      ownerId: owner.id,
      email: "left-then-back@acme.com",
      role: "member",
      token: "rejoin-after-leave",
    });

    const updated = await getUserById(sql, { id: member.id });
    expect(updated!.role).toBe("company");

    const result = await simulateAcceptInvite({
      userId: member.id,
      token: "rejoin-after-leave",
    });
    expect(result).toEqual({ ok: true });
    expect(await getActiveMembershipByUserId(sql, { userId: member.id })).not.toBeNull();
  });

  it("cannot remove owner via removeCompanyMember query", async () => {
    const { company, owner } = await seedCompany();
    const ownerMembership = await getActiveMembershipByUserId(sql, { userId: owner.id });

    const removed = await removeCompanyMember(sql, {
      id: ownerMembership!.id,
      companyId: company.id,
    });
    expect(removed).toBeNull();
    expect(await getActiveMembershipByUserId(sql, { userId: owner.id })).not.toBeNull();
  });
});

// ─── Ownership transfer ─────────────────────────────────────────

describe("ownership transfer workflows", () => {
  it("transfer leaves exactly one owner and updates companies.owner_id", async () => {
    const { company, owner } = await seedCompany();
    const admin = await seedUser({ role: "company" });

    const ownerMembership = await getActiveMembershipByUserId(sql, { userId: owner.id });
    const adminMembership = await createCompanyMember(sql, {
      companyId: company.id,
      userId: admin.id,
      role: "admin",
      invitedBy: owner.id,
    });

    await sql.begin(async (tx) => {
      const transaction = asSqlTransaction(tx);
      await updateCompanyMemberRole(transaction, {
        role: "admin",
        id: ownerMembership!.id,
        companyId: company.id,
      });
      await updateCompanyMemberRole(transaction, {
        role: "owner",
        id: adminMembership!.id,
        companyId: company.id,
      });
      await updateCompanyOwner(transaction, {
        ownerId: admin.id,
        id: company.id,
      });
    });

    const owners = await sql`
      SELECT user_id, role
      FROM company_members
      WHERE company_id = ${company.id}
        AND role = 'owner'
        AND status = 'active'
    `;
    expect(owners).toHaveLength(1);
    expect(owners[0]!.user_id).toBe(admin.id);

    const updatedCompany = await getCompanyById(sql, { id: company.id });
    expect(updatedCompany!.ownerId).toBe(admin.id);

    const formerOwner = await getMembershipById(sql, { id: ownerMembership!.id });
    expect(formerOwner!.role).toBe("admin");
  });

  it("enforces one owner per company at the database level", async () => {
    const { company, owner } = await seedCompany();
    const other = await seedUser({ role: "company" });

    const otherMembership = await createCompanyMember(sql, {
      companyId: company.id,
      userId: other.id,
      role: "admin",
      invitedBy: owner.id,
    });

    await expect(
      updateCompanyMemberRole(sql, {
        role: "owner",
        id: otherMembership!.id,
        companyId: company.id,
      }),
    ).rejects.toSatisfy((error: unknown) => isUniqueViolation(error));
  });
});

// ─── Team listing ───────────────────────────────────────────────

describe("team listing", () => {
  it("lists active members ordered owner → admin → member", async () => {
    const { company, owner } = await seedCompany();
    const admin = await seedUser({ role: "company", name: "Admin User" });
    const member = await seedUser({ role: "company", name: "Member User" });

    await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });
    await createCompanyMember(sql, {
      companyId: company.id,
      userId: admin.id,
      role: "admin",
      invitedBy: owner.id,
    });

    const members = await listActiveMembersByCompany(sql, { companyId: company.id });
    expect(members).toHaveLength(3);
    expect(members.map((m) => m.role)).toEqual(["owner", "admin", "member"]);
  });

  it("excludes removed members from active listing", async () => {
    const { company, owner } = await seedCompany();
    const member = await seedUser({ role: "company" });

    const membership = await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });
    await removeCompanyMember(sql, { id: membership!.id, companyId: company.id });

    const members = await listActiveMembersByCompany(sql, { companyId: company.id });
    expect(members).toHaveLength(1);
    expect(members[0]!.role).toBe("owner");
  });
});

// ─── Membership permissions ─────────────────────────────────────

describe("membership permissions", () => {
  it("allows owner and admin to manage team", () => {
    expect(() => assertCanManageTeam("owner")).not.toThrow();
    expect(() => assertCanManageTeam("admin")).not.toThrow();
  });

  it("rejects member from managing team", () => {
    expect(() => assertCanManageTeam("member")).toThrow("Not authorized to manage team members");
  });

  it("allows only owner for billing-sensitive actions", () => {
    expect(() => assertCompanyOwner("owner")).not.toThrow();
    expect(() => assertCompanyOwner("admin")).toThrow("Only the company owner can manage billing");
    expect(() => assertCompanyOwner("member")).toThrow("Only the company owner can manage billing");
  });
});

// ─── DB constraints ─────────────────────────────────────────────

describe("membership database constraints", () => {
  it("enforces one active membership per user", async () => {
    const { company: companyA } = await seedCompany({ name: "One Active A" });
    const { company: companyB } = await seedCompany({ name: "One Active B" });
    const user = await seedUser({ role: "company" });

    await createCompanyMember(sql, {
      companyId: companyA.id,
      userId: user.id,
      role: "member",
      invitedBy: null,
    });

    await expect(
      createCompanyMember(sql, {
        companyId: companyB.id,
        userId: user.id,
        role: "member",
        invitedBy: null,
      }),
    ).rejects.toSatisfy((error: unknown) => isUniqueViolation(error));
  });

  it("lookup by email finds active members only", async () => {
    const { company } = await seedCompany();
    const user = await seedUser({ role: "company", email: "lookup@acme.com" });

    const membership = await createCompanyMember(sql, {
      companyId: company.id,
      userId: user.id,
      role: "member",
      invitedBy: null,
    });

    const active = await getActiveMemberByCompanyEmail(sql, {
      companyId: company.id,
      email: "lookup@acme.com",
    });
    expect(active).not.toBeNull();

    await removeCompanyMember(sql, { id: membership!.id, companyId: company.id });

    const afterRemoval = await getActiveMemberByCompanyEmail(sql, {
      companyId: company.id,
      email: "lookup@acme.com",
    });
    expect(afterRemoval).toBeNull();
  });

  it("getUserByEmail resolves invite targets for eligibility checks", async () => {
    const user = await seedUser({ role: "company", email: "target@acme.com" });
    const found = await getUserByEmail(sql, { email: "target@acme.com" });
    expect(found!.id).toBe(user.id);
  });
});
