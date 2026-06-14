import { describe, expect, it } from "vitest";
import { softDeleteUser } from "@/features/auth/queries/queries_sql";
import { getTestDb, seedCompany, seedUser } from "@/shared/__tests__/test-utils";
import {
  clearCompanySubscription,
  createCompany,
  createCompanyMember,
  getActiveMembershipByUserId,
  getAllCompanies,
  getCompanyById,
  getCompanyByMemberUserId,
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
      subscriptionPlan: "pro",
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: periodEnd,
      subscriptionCancelAtPeriodEnd: false,
    });

    expect(updated).not.toBeNull();
    expect(updated!.subscriptionPlan).toBe("pro");
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
      subscriptionPlan: "pro",
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
      subscriptionPlan: "pro",
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
