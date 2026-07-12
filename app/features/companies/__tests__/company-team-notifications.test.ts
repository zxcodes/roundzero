import { describe, expect, it } from "vitest";

import { createCompanyMember } from "@/features/companies/queries/membership-queries_sql";
import { notifyCompanyTeam } from "@/features/companies/services/company-team-notifications";
import { getNotificationsByUser } from "@/features/notifications/queries/queries_sql";
import { getTestDb, seedCompany, seedUser } from "@/shared/__tests__/test-utils";

const sql = getTestDb();

describe("notifyCompanyTeam", () => {
  it("fans out notifications to owner and admins only", async () => {
    const { company, owner } = await seedCompany();
    const admin = await seedUser({ role: "company", email: "admin@acme.com" });
    const member = await seedUser({ role: "company", email: "member@acme.com" });

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

    const deliveries = await notifyCompanyTeam(sql, {
      companyId: company.id,
      type: "application_withdrawn",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Engineer",
        candidateName: "Alex",
      },
    });

    expect(deliveries).toHaveLength(2);
    expect(deliveries.map((d) => d.userId).sort()).toEqual([admin.id, owner.id].sort());

    const ownerNotifications = await getNotificationsByUser(sql, {
      userId: owner.id,
      limit: "10",
    });
    const adminNotifications = await getNotificationsByUser(sql, {
      userId: admin.id,
      limit: "10",
    });
    const memberNotifications = await getNotificationsByUser(sql, {
      userId: member.id,
      limit: "10",
    });

    expect(ownerNotifications).toHaveLength(1);
    expect(adminNotifications).toHaveLength(1);
    expect(memberNotifications).toHaveLength(0);
  });
});
