import { describe, expect, it, vi } from "vitest";

import {
  createCompanyMember,
  getActiveMembershipByUserId,
  getAnyMembershipByUserId,
  removeCompanyMember,
} from "@/features/companies/queries/membership-queries_sql";
import { resolveMyCompanyContext } from "@/features/companies/server/functions";
import { getTestDb, seedCompany, seedUser } from "@/shared/__tests__/test-utils";

vi.mock("cloudflare:workers", () => ({
  env: {
    HYPERDRIVE: {
      connectionString:
        process.env.TEST_DATABASE_URL ??
        "postgres://postgres:password@localhost:6312/postgres?sslmode=disable",
    },
    RESUMES: {
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

const sql = getTestDb();

describe("resolveMyCompanyContext", () => {
  it("returns state 'new' for a company user who has never had a membership", async () => {
    const user = await seedUser({ role: "company" });

    const context = await resolveMyCompanyContext(sql, user.id);

    expect(context.state).toBe("new");
  });

  it("returns state 'active' with company and membership for an active owner", async () => {
    const { company, owner } = await seedCompany();

    const context = await resolveMyCompanyContext(sql, owner.id);

    expect(context.state).toBe("active");
    if (context.state !== "active") {
      throw new Error("expected active context");
    }
    expect(context.company.id).toBe(company.id);
    expect(context.membership.role).toBe("owner");
    expect(context.membership.status).toBe("active");
  });

  it("returns state 'removed' for a user whose only membership is removed", async () => {
    const { company, owner } = await seedCompany();
    const member = await seedUser({ role: "company" });
    const membership = await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });
    const removed = await removeCompanyMember(sql, {
      id: membership!.id,
      companyId: company.id,
    });
    expect(removed).not.toBeNull();

    const context = await resolveMyCompanyContext(sql, member.id);

    expect(context.state).toBe("removed");
  });
});

describe("getAnyMembershipByUserId", () => {
  it("returns null for a user who has never been a company member", async () => {
    const user = await seedUser({ role: "company" });

    const membership = await getAnyMembershipByUserId(sql, { userId: user.id });

    expect(membership).toBeNull();
  });

  it("returns the removed membership for a removed user", async () => {
    const { company, owner } = await seedCompany();
    const member = await seedUser({ role: "company" });
    const membership = await createCompanyMember(sql, {
      companyId: company.id,
      userId: member.id,
      role: "member",
      invitedBy: owner.id,
    });
    await removeCompanyMember(sql, { id: membership!.id, companyId: company.id });

    const anyMembership = await getAnyMembershipByUserId(sql, { userId: member.id });
    const activeMembership = await getActiveMembershipByUserId(sql, { userId: member.id });

    expect(anyMembership).not.toBeNull();
    expect(anyMembership!.status).toBe("removed");
    expect(activeMembership).toBeNull();
  });
});
