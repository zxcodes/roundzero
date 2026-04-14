import { describe, expect, it } from "vitest";
import {
  createNotification,
  getNotificationsByUser,
} from "@/features/notifications/queries/queries_sql";
import { getTestDb, seedCompany, seedJob } from "@/shared/__tests__/test-utils";

const sql = getTestDb();

describe("Job Lifecycle Notifications", () => {
  it("can create a job_published notification", async () => {
    const { company, owner } = await seedCompany({
      name: "TechCorp",
    });
    const { job } = await seedJob({
      companyId: company.id,
      title: "Senior Engineer",
      status: "draft",
    });

    // Simulate publishing: create notification
    const notification = await createNotification(sql, {
      userId: owner.id,
      type: "job_published",
      payload: {
        jobId: job.id,
        jobTitle: job.title,
        status: "open",
      },
    });

    expect(notification).not.toBeNull();
    expect(notification?.type).toBe("job_published");
    expect(notification?.payload).toEqual({
      jobId: job.id,
      jobTitle: "Senior Engineer",
      status: "open",
    });

    // Verify notification appears in user's feed
    const notifications = await getNotificationsByUser(sql, {
      userId: owner.id,
      limit: "10",
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("job_published");
  });

  it("can create a job_archived notification", async () => {
    const { company, owner } = await seedCompany({
      name: "StartupCo",
    });
    const { job } = await seedJob({
      companyId: company.id,
      title: "Product Manager",
      status: "open",
    });

    // Simulate archiving: create notification
    const notification = await createNotification(sql, {
      userId: owner.id,
      type: "job_archived",
      payload: {
        jobId: job.id,
        jobTitle: job.title,
        status: "closed",
      },
    });

    expect(notification).not.toBeNull();
    expect(notification?.type).toBe("job_archived");
    expect(notification?.payload).toEqual({
      jobId: job.id,
      jobTitle: "Product Manager",
      status: "closed",
    });

    // Verify notification appears in user's feed
    const notifications = await getNotificationsByUser(sql, {
      userId: owner.id,
      limit: "10",
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("job_archived");
  });
});
