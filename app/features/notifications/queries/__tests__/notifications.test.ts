import { describe, expect, it } from "vitest";
import { getTestDb, seedUser } from "@/shared/__tests__/test-utils";
import {
  countUnreadNotificationsByUser,
  createNotification,
  getNotificationsByUser,
  markAllNotificationsReadByUser,
  markNotificationEmailDelivered,
  markNotificationEmailFailed,
  markNotificationEmailSkipped,
  markNotificationReadByUser,
} from "../queries_sql";

const sql = getTestDb();

describe("createNotification", () => {
  it("creates a notification row with unread state by default", async () => {
    const user = await seedUser({ role: "candidate" });

    const created = await createNotification(sql, {
      userId: user.id,
      type: "application_status_changed",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Frontend Engineer",
        companyName: "RoundZero",
        status: "interviewing",
      },
    });

    expect(created).not.toBeNull();
    expect(created!.userId).toBe(user.id);
    expect(created!.type).toBe("application_status_changed");
    expect(created!.readAt).toBeNull();
  });
});

describe("getNotificationsByUser", () => {
  it("returns newest notifications first for the requested user only", async () => {
    const firstUser = await seedUser({ role: "candidate" });
    const secondUser = await seedUser({ role: "company" });

    await createNotification(sql, {
      userId: firstUser.id,
      type: "new_applicant",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Platform Engineer",
        candidateName: "Ava Malik",
      },
    });
    await createNotification(sql, {
      userId: secondUser.id,
      type: "new_applicant",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Designer",
        candidateName: "Second User",
      },
    });
    const latest = await createNotification(sql, {
      userId: firstUser.id,
      type: "application_status_changed",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Product Engineer",
        companyName: "Northwind",
        status: "evaluated",
      },
    });

    const items = await getNotificationsByUser(sql, {
      userId: firstUser.id,
      limit: "10",
    });

    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(latest!.id);
  });
});

describe("notification read state", () => {
  it("counts unread notifications and marks a single notification as read", async () => {
    const user = await seedUser({ role: "candidate" });
    const created = await createNotification(sql, {
      userId: user.id,
      type: "application_status_changed",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Backend Engineer",
        companyName: "Orbit",
        status: "applied",
      },
    });

    const before = await countUnreadNotificationsByUser(sql, { userId: user.id });
    expect(before?.unreadCount).toBe(1);

    const updated = await markNotificationReadByUser(sql, {
      id: created!.id,
      userId: user.id,
    });

    expect(updated).not.toBeNull();
    expect(updated!.readAt).toBeInstanceOf(Date);

    const after = await countUnreadNotificationsByUser(sql, { userId: user.id });
    expect(after?.unreadCount).toBe(0);
  });

  it("marks every unread notification for a user as read", async () => {
    const user = await seedUser({ role: "company" });

    await createNotification(sql, {
      userId: user.id,
      type: "new_applicant",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Staff Engineer",
        candidateName: "Imran Shah",
      },
    });
    await createNotification(sql, {
      userId: user.id,
      type: "new_applicant",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Staff Engineer",
        candidateName: "Aisha Noor",
      },
    });

    await markAllNotificationsReadByUser(sql, { userId: user.id });

    const unread = await countUnreadNotificationsByUser(sql, { userId: user.id });
    expect(unread?.unreadCount).toBe(0);
  });
});

describe("notification email delivery state", () => {
  it("marks a notification as email-delivered", async () => {
    const user = await seedUser({ role: "candidate" });
    const notification = await createNotification(sql, {
      userId: user.id,
      type: "application_status_changed",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Platform Engineer",
        companyName: "RoundZero",
        status: "interviewing",
      },
    });

    const updated = await markNotificationEmailDelivered(sql, {
      id: notification!.id,
      providerMessageId: "re_123",
    });

    expect(updated).not.toBeNull();
    expect(updated!.emailDeliveryStatus).toBe("sent");
    expect(updated!.emailDeliveryAttemptedAt).toBeInstanceOf(Date);
    expect(updated!.emailDeliverySentAt).toBeInstanceOf(Date);
    expect(updated!.emailProviderMessageId).toBe("re_123");
    expect(updated!.emailDeliveryError).toBeNull();
  });

  it("marks a notification as email-failed or skipped", async () => {
    const user = await seedUser({ role: "company" });
    const failed = await createNotification(sql, {
      userId: user.id,
      type: "new_applicant",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Designer",
        candidateName: "Nadia Khan",
      },
    });
    const skipped = await createNotification(sql, {
      userId: user.id,
      type: "new_applicant",
      payload: {
        applicationId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        jobTitle: "Designer",
        candidateName: "Hana Ali",
      },
    });

    const failedUpdated = await markNotificationEmailFailed(sql, {
      id: failed!.id,
      errorMessage: "Resend rejected request",
    });
    const skippedUpdated = await markNotificationEmailSkipped(sql, {
      id: skipped!.id,
      reason: "Email delivery is not configured",
    });

    expect(failedUpdated).not.toBeNull();
    expect(failedUpdated!.emailDeliveryStatus).toBe("failed");
    expect(failedUpdated!.emailDeliveryAttemptedAt).toBeInstanceOf(Date);
    expect(failedUpdated!.emailDeliverySentAt).toBeNull();
    expect(failedUpdated!.emailDeliveryError).toBe("Resend rejected request");
    expect(failedUpdated!.emailProviderMessageId).toBeNull();

    expect(skippedUpdated).not.toBeNull();
    expect(skippedUpdated!.emailDeliveryStatus).toBe("skipped");
    expect(skippedUpdated!.emailDeliveryAttemptedAt).toBeInstanceOf(Date);
    expect(skippedUpdated!.emailDeliverySentAt).toBeNull();
    expect(skippedUpdated!.emailDeliveryError).toBe("Email delivery is not configured");
    expect(skippedUpdated!.emailProviderMessageId).toBeNull();
  });
});
