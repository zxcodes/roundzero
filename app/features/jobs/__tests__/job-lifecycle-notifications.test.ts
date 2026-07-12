import { describe, expect, it } from "vitest";

import { getNotificationsByUser } from "@/features/notifications/queries/queries_sql";
import { getTestDb, seedCompany, seedJob } from "@/shared/__tests__/test-utils";

import {
  isJobPublishTransition,
  notifyJobPublished,
} from "../services/job-lifecycle-notifications";

const sql = getTestDb();

describe("isJobPublishTransition", () => {
  it("detects draft to open", () => {
    expect(isJobPublishTransition("draft", "open")).toBe(true);
  });

  it("detects closed to open", () => {
    expect(isJobPublishTransition("closed", "open")).toBe(true);
  });

  it("ignores open to open updates", () => {
    expect(isJobPublishTransition("open", "open")).toBe(false);
  });

  it("ignores non-open targets", () => {
    expect(isJobPublishTransition("draft", "draft")).toBe(false);
    expect(isJobPublishTransition("open", "closed")).toBe(false);
  });
});

describe("notifyJobPublished", () => {
  it("fans out job_published notifications to the company team", async () => {
    const { company, owner } = await seedCompany({ name: "Acme" });
    const { job } = await seedJob({
      companyId: company.id,
      title: "Senior Engineer",
      status: "open",
    });

    await notifyJobPublished(sql, company.id, job);

    const notifications = await getNotificationsByUser(sql, {
      userId: owner.id,
      limit: "10",
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("job_published");
    expect(notifications[0].payload).toEqual({
      jobId: job.id,
      jobTitle: "Senior Engineer",
      status: "open",
    });
  });
});
