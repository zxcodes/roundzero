import { describe, expect, it } from "vitest";

import {
  countFeedbackForPlatformAdmin,
  createFeedback,
  listFeedbackForPlatformAdmin,
} from "@/features/feedback/queries/queries_sql";
import { getTestDb, seedCompany, seedUser } from "@/shared/__tests__/test-utils";

const sql = getTestDb();

describe("platform admin feedback queries", () => {
  it("lists feedback with user and company context", async () => {
    const { company, owner } = await seedCompany();
    const candidate = await seedUser({ role: "candidate" });

    await createFeedback(sql, {
      userId: owner.id,
      role: "company",
      type: "bug",
      message: "Billing page is blank after checkout.",
      companyId: company.id,
    });
    await createFeedback(sql, {
      userId: candidate.id,
      role: "candidate",
      type: "general",
      message: "Love the interview flow.",
      companyId: null,
    });

    const total = await countFeedbackForPlatformAdmin(sql);
    const items = await listFeedbackForPlatformAdmin(sql, { offset: 0, limit: 10 });

    expect(total?.total).toBeGreaterThanOrEqual(2);

    const companyFeedback = items.find((item) => item.userId === owner.id);
    const candidateFeedback = items.find((item) => item.userId === candidate.id);

    expect(companyFeedback).toMatchObject({
      type: "bug",
      userEmail: owner.email,
      companyName: company.name,
      companySlug: company.slug,
    });
    expect(candidateFeedback).toMatchObject({
      type: "general",
      userEmail: candidate.email,
      companyName: null,
      companySlug: null,
    });
  });
});
