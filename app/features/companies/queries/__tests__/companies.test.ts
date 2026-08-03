import { describe, expect, it } from "vitest";

import { softDeleteUser } from "@/features/auth/queries/queries_sql";
import { getTestDb, seedCompany, seedUser } from "@/shared/__tests__/test-utils";

import {
  countTeamSlotsByCompany,
  createCompanyMember,
  createInvitation,
  getActiveMemberByCompanyEmail,
  getActiveMembershipByUserId,
  getCompanyByMemberUserId,
  getInvitationByToken,
  getMembershipByCompanyAndUser,
  getPendingInvitationByEmail,
  listCompanyNotificationRecipients,
  listPendingInvitationsByCompany,
  markInvitationAccepted,
  reactivateCompanyMember,
  removeCompanyMember,
  resetInvitationForResend,
  revokeExpiredInvitationsByEmail,
  revokeInvitation as revokeInvitationQuery,
  updateCompanyMemberRole,
  updateCompanyOwner,
} from "../membership-queries_sql";
import {
  clearCompanySubscription,
  createCompany,
  dismissCompanyJobImportPrompt,
  getAllCompanies,
  getCompanyById,
  getCompanyByOwnerId,
  getCompanyByPolarCustomerId,
  getCompanyBySlug,
  setCompanyPolarCustomer,
  slugExists,
  updateCompanyProfile,
  updateCompanySubscription,
} from "../queries_sql";

const sql = getTestDb();

describe("createCompany", () => {
  it("creates a company linked to an owner", async () => {
    const owner = await seedUser({ role: "company" });

    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "Acme Corp",
      slug: "acme-corp",
      description: "Building great things",
      logoKey: null,
      industry: "technology",
      companySize: "51-200",
    });

    expect(company).not.toBeNull();
    expect(company!.name).toBe("Acme Corp");
    expect(company!.slug).toBe("acme-corp");
    expect(company!.description).toBe("Building great things");
    expect(company!.industry).toBe("technology");
    expect(company!.companySize).toBe("51-200");
    expect(company!.ownerId).toBe(owner.id);
    expect(company!.id).toBeDefined();
    expect(company!.createdAt).toBeInstanceOf(Date);
  });

  it("creates a company with null optional fields", async () => {
    const owner = await seedUser({ role: "company" });

    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "No Extras Corp",
      slug: "no-extras-corp",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });

    expect(company).not.toBeNull();
    expect(company!.description).toBeNull();
    expect(company!.industry).toBeNull();
    expect(company!.companySize).toBeNull();
  });

  it("enforces unique slug constraint", async () => {
    const owner1 = await seedUser({ role: "company" });
    const owner2 = await seedUser({ role: "company" });

    await createCompany(sql, {
      ownerId: owner1.id,
      name: "First",
      slug: "duplicate-slug",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });

    await expect(
      createCompany(sql, {
        ownerId: owner2.id,
        name: "Second",
        slug: "duplicate-slug",
        description: null,
        logoKey: null,
        industry: null,
        companySize: null,
      }),
    ).rejects.toThrow();
  });
});

describe("dismissCompanyJobImportPrompt", () => {
  it("persists the import announcement dismissal", async () => {
    const { company } = await seedCompany();
    const initial = await getCompanyById(sql, { id: company.id });
    expect(initial?.jobImportPromptDismissedAt).toBeNull();

    const updated = await dismissCompanyJobImportPrompt(sql, { id: company.id });
    expect(updated?.jobImportPromptDismissedAt).toBeInstanceOf(Date);

    const found = await getCompanyById(sql, { id: company.id });
    expect(found?.jobImportPromptDismissedAt).toBeInstanceOf(Date);
  });
});

describe("getCompanyByOwnerId", () => {
  it("returns the company for a given owner", async () => {
    const owner = await seedUser({ role: "company" });
    const created = await createCompany(sql, {
      ownerId: owner.id,
      name: "My Co",
      slug: "my-co",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });

    const found = await getCompanyByOwnerId(sql, { ownerId: owner.id });
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created!.id);
    expect(found!.name).toBe("My Co");
    expect(found!.slug).toBe("my-co");
  });

  it("returns null if owner has no company", async () => {
    const owner = await seedUser({ role: "company" });
    const found = await getCompanyByOwnerId(sql, { ownerId: owner.id });
    expect(found).toBeNull();
  });
});

describe("getCompanyById", () => {
  it("returns the company by id", async () => {
    const owner = await seedUser({ role: "company" });
    const created = await createCompany(sql, {
      ownerId: owner.id,
      name: "By ID Corp",
      slug: "by-id-corp",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });

    const found = await getCompanyById(sql, { id: created!.id });
    expect(found).not.toBeNull();
    expect(found!.name).toBe("By ID Corp");
  });

  it("returns null for non-existent id", async () => {
    const found = await getCompanyById(sql, { id: "00000000-0000-0000-0000-000000000000" });
    expect(found).toBeNull();
  });
});

describe("getCompanyBySlug", () => {
  it("returns the company with owner info", async () => {
    const owner = await seedUser({ role: "company", name: "Jane Doe" });
    await createCompany(sql, {
      ownerId: owner.id,
      name: "Slug Corp",
      slug: "slug-corp",
      description: "A test company",
      logoKey: null,
      industry: "saas",
      companySize: "11-50",
    });

    const found = await getCompanyBySlug(sql, { slug: "slug-corp" });
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Slug Corp");
    expect(found!.ownerName).toBe("Jane Doe");
    expect(found!.industry).toBe("saas");
  });

  it("returns null for non-existent slug", async () => {
    const found = await getCompanyBySlug(sql, { slug: "does-not-exist" });
    expect(found).toBeNull();
  });

  it("returns null when the owner was soft-deleted", async () => {
    const owner = await seedUser({ role: "company" });
    await createCompany(sql, {
      ownerId: owner.id,
      name: "Deleted Corp",
      slug: "deleted-corp",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });
    await softDeleteUser(sql, { id: owner.id });

    const found = await getCompanyBySlug(sql, { slug: "deleted-corp" });
    expect(found).toBeNull();
  });
});

describe("updateCompanyProfile", () => {
  it("updates all profile fields", async () => {
    const owner = await seedUser({ role: "company" });
    const created = await createCompany(sql, {
      ownerId: owner.id,
      name: "Old Name",
      slug: "old-name",
      description: "Old desc",
      logoKey: null,
      industry: null,
      companySize: null,
    });

    const updated = await updateCompanyProfile(sql, {
      id: created!.id,
      name: "New Name",
      description: "New desc",
      logoKey: "company-logos/user-123/logo.png",
      website: "https://newname.com",
      industry: "finance",
      companySize: "201-500",
      foundedYear: 2020,
      location: "San Francisco, CA",
      techStack: ["TypeScript", "React"],
      culture: "We value collaboration",
      socialLinks: { linkedin: "https://linkedin.com/company/new" },
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("New Name");
    expect(updated!.description).toBe("New desc");
    expect(updated!.logoKey).toBe("company-logos/user-123/logo.png");
    expect(updated!.website).toBe("https://newname.com");
    expect(updated!.industry).toBe("finance");
    expect(updated!.companySize).toBe("201-500");
    expect(updated!.foundedYear).toBe(2020);
    expect(updated!.location).toBe("San Francisco, CA");
    expect(updated!.culture).toBe("We value collaboration");
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(created!.createdAt.getTime());
  });

  // Note: authorization (who may edit a company) moved from this query's
  // WHERE clause to the membership layer (companyMiddleware + role checks).
  // The query now scopes by company id only, so there is no owner-mismatch
  // case to test here anymore.
});

describe("slugExists", () => {
  it("returns true when slug exists", async () => {
    const owner = await seedUser({ role: "company" });
    await createCompany(sql, {
      ownerId: owner.id,
      name: "Existing",
      slug: "existing-slug",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });

    const result = await slugExists(sql, { slug: "existing-slug" });
    expect(result).not.toBeNull();
    expect(result!.exists).toBe(true);
  });

  it("returns false when slug does not exist", async () => {
    const result = await slugExists(sql, { slug: "nonexistent-slug" });
    expect(result).not.toBeNull();
    expect(result!.exists).toBe(false);
  });
});

describe("getAllCompanies", () => {
  it("returns companies with open job count", async () => {
    const owner = await seedUser({ role: "company" });
    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "Jobs Corp",
      slug: "jobs-corp",
      description: null,
      logoKey: null,
      industry: "technology",
      companySize: "51-200",
    });

    // Insert an open job directly
    await sql`
      INSERT INTO jobs (company_id, title, description, status)
      VALUES (${company!.id}, ${"Test Job"}, ${"Desc"}, ${"open"})
    `;

    const all = await getAllCompanies(sql);
    expect(all.length).toBeGreaterThanOrEqual(1);

    const found = all.find((c) => c.id === company!.id);
    expect(found).toBeDefined();
    expect(found!.openJobCount).toBe(1);
  });

  it("excludes companies whose owner was soft-deleted", async () => {
    const owner = await seedUser({ role: "company" });
    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "Ghost Corp",
      slug: "ghost-corp",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });
    await softDeleteUser(sql, { id: owner.id });

    const all = await getAllCompanies(sql);
    expect(all.find((c) => c.id === company!.id)).toBeUndefined();
  });
});

// ─── Billing / subscription queries ─────────────────────────────

describe("setCompanyPolarCustomer", () => {
  it("sets polar_customer_id on a company", async () => {
    const owner = await seedUser({ role: "company" });
    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "Billing Co",
      slug: "billing-co",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });

    const updated = await setCompanyPolarCustomer(sql, {
      id: company!.id,
      polarCustomerId: "polar_cust_123",
    });

    expect(updated).not.toBeNull();
    expect(updated!.polarCustomerId).toBe("polar_cust_123");
  });
});

describe("getCompanyByPolarCustomerId", () => {
  it("finds company by polar customer id", async () => {
    const owner = await seedUser({ role: "company" });
    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "Polar Co",
      slug: "polar-co",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });
    await setCompanyPolarCustomer(sql, {
      id: company!.id,
      polarCustomerId: "polar_cust_456",
    });

    const found = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "polar_cust_456" });
    expect(found).not.toBeNull();
    expect(found!.id).toBe(company!.id);
    expect(found!.name).toBe("Polar Co");
  });

  it("returns null for unknown polar customer id", async () => {
    const found = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "unknown" });
    expect(found).toBeNull();
  });
});

describe("updateCompanySubscription", () => {
  it("updates subscription fields by polar customer id", async () => {
    const owner = await seedUser({ role: "company" });
    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "Sub Co",
      slug: "sub-co",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });
    await setCompanyPolarCustomer(sql, {
      id: company!.id,
      polarCustomerId: "polar_cust_sub",
    });

    const periodEnd = new Date("2026-12-31T00:00:00Z");
    const updated = await updateCompanySubscription(sql, {
      polarCustomerId: "polar_cust_sub",
      polarSubscriptionId: "sub_123",
      polarProductId: "prod_123",
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: periodEnd,
      subscriptionCancelAtPeriodEnd: false,
    });

    expect(updated).not.toBeNull();
    expect(updated!.subscriptionPlan).toBe("starter");
    expect(updated!.subscriptionStatus).toBe("active");
    expect(updated!.polarSubscriptionId).toBe("sub_123");
    expect(updated!.polarProductId).toBe("prod_123");
    expect(updated!.subscriptionCurrentPeriodEnd).toEqual(periodEnd);
    expect(updated!.subscriptionCancelAtPeriodEnd).toBe(false);
  });

  it("returns null when polar customer id does not match any company", async () => {
    const result = await updateCompanySubscription(sql, {
      polarCustomerId: "nonexistent",
      polarSubscriptionId: "sub_123",
      polarProductId: "prod_123",
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false,
    });
    expect(result).toBeNull();
  });
});

describe("clearCompanySubscription", () => {
  it("resets subscription to free/canceled", async () => {
    const owner = await seedUser({ role: "company" });
    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "Cancel Co",
      slug: "cancel-co",
      description: null,
      logoKey: null,
      industry: null,
      companySize: null,
    });
    await setCompanyPolarCustomer(sql, {
      id: company!.id,
      polarCustomerId: "polar_cust_cancel",
    });
    await updateCompanySubscription(sql, {
      polarCustomerId: "polar_cust_cancel",
      polarSubscriptionId: "sub_123",
      polarProductId: "prod_123",
      subscriptionPlan: "starter",
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: new Date(),
      subscriptionCancelAtPeriodEnd: false,
    });

    const cleared = await clearCompanySubscription(sql, { polarCustomerId: "polar_cust_cancel" });

    expect(cleared).not.toBeNull();
    expect(cleared!.subscriptionPlan).toBe("free");
    expect(cleared!.subscriptionStatus).toBe("canceled");
    expect(cleared!.polarSubscriptionId).toBeNull();
    expect(cleared!.polarProductId).toBeNull();
    expect(cleared!.subscriptionCurrentPeriodEnd).toBeNull();
    expect(cleared!.subscriptionCancelAtPeriodEnd).toBe(false);
  });

  it("returns null for unknown polar customer id", async () => {
    const result = await clearCompanySubscription(sql, { polarCustomerId: "unknown" });
    expect(result).toBeNull();
  });
});

describe("company membership", () => {
  it("getActiveMembershipByUserId returns the owner membership for a seeded company", async () => {
    const { company, owner } = await seedCompany();

    const membership = await getActiveMembershipByUserId(sql, { userId: owner.id });

    expect(membership).not.toBeNull();
    expect(membership!.companyId).toBe(company.id);
    expect(membership!.role).toBe("owner");
    expect(membership!.status).toBe("active");
  });

  it("getActiveMembershipByUserId returns null for a user with no membership", async () => {
    const stranger = await seedUser({ role: "company" });

    const membership = await getActiveMembershipByUserId(sql, { userId: stranger.id });

    expect(membership).toBeNull();
  });

  it("getCompanyByMemberUserId resolves the company for an added member", async () => {
    const { company } = await seedCompany();
    const teammate = await seedUser({ role: "company" });

    await createCompanyMember(sql, {
      companyId: company.id,
      userId: teammate.id,
      role: "admin",
      invitedBy: null,
    });

    const resolved = await getCompanyByMemberUserId(sql, { userId: teammate.id });

    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(company.id);
    expect(resolved!.name).toBe(company.name);
  });

  it("removed members are not resolved by membership queries", async () => {
    const { company } = await seedCompany();
    const teammate = await seedUser({ role: "company" });

    const member = await createCompanyMember(sql, {
      companyId: company.id,
      userId: teammate.id,
      role: "member",
      invitedBy: null,
    });
    await sql`
      UPDATE company_members
      SET status = 'removed', updated_at = now()
      WHERE id = ${member!.id}
    `;

    expect(await getActiveMembershipByUserId(sql, { userId: teammate.id })).toBeNull();
    expect(await getCompanyByMemberUserId(sql, { userId: teammate.id })).toBeNull();
  });
});

describe("company invitations", () => {
  it("creates and resolves a pending invitation by token", async () => {
    const { company, owner } = await seedCompany();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await createInvitation(sql, {
      companyId: company.id,
      email: "teammate@acme.com",
      role: "admin",
      token: "invite-token-1",
      invitedBy: owner.id,
      expiresAt,
    });

    expect(invitation).not.toBeNull();

    const byToken = await getInvitationByToken(sql, { token: "invite-token-1" });
    expect(byToken).not.toBeNull();
    expect(byToken!.companyName).toBe(company.name);
    expect(byToken!.email).toBe("teammate@acme.com");
    expect(byToken!.acceptedAt).toBeNull();
    expect(byToken!.revokedAt).toBeNull();
  });

  it("lists pending invitations and revokes them", async () => {
    const { company, owner } = await seedCompany();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await createInvitation(sql, {
      companyId: company.id,
      email: "pending@acme.com",
      role: "member",
      token: "invite-token-2",
      invitedBy: owner.id,
      expiresAt,
    });

    const pending = await listPendingInvitationsByCompany(sql, { companyId: company.id });
    expect(pending).toHaveLength(1);
    expect(pending[0]!.email).toBe("pending@acme.com");

    const revoked = await revokeInvitationQuery(sql, {
      id: invitation!.id,
      companyId: company.id,
    });
    expect(revoked).not.toBeNull();

    const after = await listPendingInvitationsByCompany(sql, { companyId: company.id });
    expect(after).toHaveLength(0);
  });

  it("resets token and expiry on resend", async () => {
    const { company, owner } = await seedCompany();
    const expiresAt = new Date(Date.now() + 60_000);

    const invitation = await createInvitation(sql, {
      companyId: company.id,
      email: "resend@acme.com",
      role: "member",
      token: "old-token",
      invitedBy: owner.id,
      expiresAt,
    });

    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const resent = await resetInvitationForResend(sql, {
      id: invitation!.id,
      companyId: company.id,
      token: "new-token",
      expiresAt: newExpiry,
    });

    expect(resent).not.toBeNull();
    expect(resent!.token).toBe("new-token");

    expect(await getInvitationByToken(sql, { token: "old-token" })).toBeNull();
    expect(await getInvitationByToken(sql, { token: "new-token" })).not.toBeNull();
  });

  it("ignores expired invitations when checking pending by email", async () => {
    const { company, owner } = await seedCompany();
    const expiredAt = new Date(Date.now() - 60_000);

    await createInvitation(sql, {
      companyId: company.id,
      email: "expired@acme.com",
      role: "member",
      token: "expired-token",
      invitedBy: owner.id,
      expiresAt: expiredAt,
    });

    const pending = await getPendingInvitationByEmail(sql, {
      companyId: company.id,
      email: "expired@acme.com",
    });
    expect(pending).toBeNull();

    const listed = await listPendingInvitationsByCompany(sql, { companyId: company.id });
    expect(listed).toHaveLength(0);
  });

  it("revokeExpiredInvitationsByEmail clears stale rows so a new invite can be created", async () => {
    const { company, owner } = await seedCompany();
    const expiredAt = new Date(Date.now() - 60_000);

    await createInvitation(sql, {
      companyId: company.id,
      email: "stale@acme.com",
      role: "member",
      token: "stale-token",
      invitedBy: owner.id,
      expiresAt: expiredAt,
    });

    await revokeExpiredInvitationsByEmail(sql, {
      companyId: company.id,
      email: "stale@acme.com",
    });

    const fresh = await createInvitation(sql, {
      companyId: company.id,
      email: "stale@acme.com",
      role: "admin",
      token: "fresh-token",
      invitedBy: owner.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    expect(fresh).not.toBeNull();
    expect(fresh!.role).toBe("admin");
  });

  it("marks invitation accepted and detects existing members by email", async () => {
    const { company, owner } = await seedCompany();
    const teammate = await seedUser({ role: "company", email: "member@acme.com" });
    await createCompanyMember(sql, {
      companyId: company.id,
      userId: teammate.id,
      role: "member",
      invitedBy: owner.id,
    });

    const existing = await getActiveMemberByCompanyEmail(sql, {
      companyId: company.id,
      email: "member@acme.com",
    });
    expect(existing).not.toBeNull();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await createInvitation(sql, {
      companyId: company.id,
      email: "fresh@acme.com",
      role: "member",
      token: "accept-token",
      invitedBy: owner.id,
      expiresAt,
    });

    const accepted = await markInvitationAccepted(sql, { id: invitation!.id });
    expect(accepted).not.toBeNull();

    const pending = await getPendingInvitationByEmail(sql, {
      companyId: company.id,
      email: "fresh@acme.com",
    });
    expect(pending).toBeNull();
  });
});

describe("countTeamSlotsByCompany", () => {
  it("counts active members and pending invitations separately", async () => {
    const { company, owner } = await seedCompany();
    const invitee = await seedUser({ role: "company", email: "pending-seat@acme.com" });

    await createInvitation(sql, {
      companyId: company.id,
      email: invitee.email,
      role: "member",
      token: "pending-seat-token",
      invitedBy: owner.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const counts = await countTeamSlotsByCompany(sql, { companyId: company.id });
    expect(counts).toEqual({ invitedMemberCount: 0, pendingInviteCount: 1 });
  });
});

describe("company team management", () => {
  it("lists owner and admins as notification recipients", async () => {
    const { company, owner } = await seedCompany();
    const admin = await seedUser({ role: "company" });
    const member = await seedUser({ role: "company" });

    await createCompanyMember(sql, {
      companyId: company.id,
      userId: admin.id,
      role: "admin",
      invitedBy: owner.id,
    });
    await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });

    const recipients = await listCompanyNotificationRecipients(sql, {
      companyId: company.id,
    });

    expect(recipients).toHaveLength(2);
    expect(recipients.map((r) => r.userId).sort()).toEqual([admin.id, owner.id].sort());
  });

  it("transfers ownership by demoting old owner and updating companies.owner_id", async () => {
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
      const transaction = tx as unknown as typeof sql;
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

    const updatedCompany = await getCompanyById(sql, { id: company.id });
    expect(updatedCompany!.ownerId).toBe(admin.id);

    const newOwnerMembership = await getActiveMembershipByUserId(sql, { userId: admin.id });
    const formerOwnerMembership = await getActiveMembershipByUserId(sql, { userId: owner.id });
    expect(newOwnerMembership!.role).toBe("owner");
    expect(formerOwnerMembership!.role).toBe("admin");
  });

  it("reactivates a removed membership for re-invited teammates", async () => {
    const { company } = await seedCompany();
    const member = await seedUser({ role: "company" });

    const membership = await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: null,
    });

    await removeCompanyMember(sql, {
      id: membership!.id,
      companyId: company.id,
    });

    const prior = await getMembershipByCompanyAndUser(sql, {
      companyId: company.id,
      userId: member.id,
    });
    expect(prior!.status).toBe("removed");

    const reactivated = await reactivateCompanyMember(sql, {
      role: "admin",
      invitedBy: null,
      companyId: company.id,
      userId: member.id,
    });
    expect(reactivated).not.toBeNull();
    expect(reactivated!.status).toBe("active");
    expect(reactivated!.role).toBe("admin");
    expect(await getActiveMembershipByUserId(sql, { userId: member.id })).not.toBeNull();
  });

  it("lets non-owners leave by marking membership removed", async () => {
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
    expect(await getActiveMembershipByUserId(sql, { userId: member.id })).toBeNull();
  });

  it("does not remove the company owner", async () => {
    const { company, owner } = await seedCompany();
    const ownerMembership = await getActiveMembershipByUserId(sql, { userId: owner.id });

    const removed = await removeCompanyMember(sql, {
      id: ownerMembership!.id,
      companyId: company.id,
    });
    expect(removed).toBeNull();
  });

  it("reactivateCompanyMember returns null when membership is not removed", async () => {
    const { company } = await seedCompany();
    const member = await seedUser({ role: "company" });

    await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: null,
    });

    const result = await reactivateCompanyMember(sql, {
      role: "admin",
      invitedBy: null,
      companyId: company.id,
      userId: member.id,
    });
    expect(result).toBeNull();
  });
});

describe("invitation edge cases", () => {
  it("revokeInvitation returns null for already accepted invitations", async () => {
    const { company, owner } = await seedCompany();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await createInvitation(sql, {
      companyId: company.id,
      email: "accepted@acme.com",
      role: "member",
      token: "accepted-revoke",
      invitedBy: owner.id,
      expiresAt,
    });

    await markInvitationAccepted(sql, { id: invitation!.id });

    const revoked = await revokeInvitationQuery(sql, {
      id: invitation!.id,
      companyId: company.id,
    });
    expect(revoked).toBeNull();
  });

  it("markInvitationAccepted returns null on second accept", async () => {
    const { company, owner } = await seedCompany();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await createInvitation(sql, {
      companyId: company.id,
      email: "double-accept@acme.com",
      role: "member",
      token: "double-accept",
      invitedBy: owner.id,
      expiresAt,
    });

    const first = await markInvitationAccepted(sql, { id: invitation!.id });
    expect(first).not.toBeNull();

    const second = await markInvitationAccepted(sql, { id: invitation!.id });
    expect(second).toBeNull();
  });

  it("revokeInvitation returns null for already revoked invitations", async () => {
    const { company, owner } = await seedCompany();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await createInvitation(sql, {
      companyId: company.id,
      email: "already-revoked@acme.com",
      role: "member",
      token: "already-revoked",
      invitedBy: owner.id,
      expiresAt,
    });

    const first = await revokeInvitationQuery(sql, {
      id: invitation!.id,
      companyId: company.id,
    });
    expect(first).not.toBeNull();

    const second = await revokeInvitationQuery(sql, {
      id: invitation!.id,
      companyId: company.id,
    });
    expect(second).toBeNull();
  });

  it("blocks duplicate pending invitations for the same email via unique index", async () => {
    const { company, owner } = await seedCompany();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await createInvitation(sql, {
      companyId: company.id,
      email: "duplicate-pending@acme.com",
      role: "member",
      token: "dup-pending-1",
      invitedBy: owner.id,
      expiresAt,
    });

    await expect(
      createInvitation(sql, {
        companyId: company.id,
        email: "duplicate-pending@acme.com",
        role: "admin",
        token: "dup-pending-2",
        invitedBy: owner.id,
        expiresAt,
      }),
    ).rejects.toThrow();
  });
});
