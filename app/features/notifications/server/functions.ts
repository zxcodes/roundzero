import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";
import {
  countUnreadNotificationsByUser,
  getNotificationsByUser,
  markAllNotificationsReadByUser,
  markNotificationReadByUser,
} from "../queries/queries_sql";

const notificationIdSchema = z.object({
  notificationId: z.string().uuid(),
});

export const getMyNotificationsFeed = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const [items, unread] = await Promise.all([
      getNotificationsByUser(db, { userId: context.userId, limit: "100" }),
      countUnreadNotificationsByUser(db, { userId: context.userId }),
    ]);

    return {
      items,
      unreadCount: unread?.unreadCount ?? 0,
    };
  });

export const markMyNotificationRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(notificationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    return await markNotificationReadByUser(db, {
      id: data.notificationId,
      userId: context.userId,
    });
  });

export const markAllMyNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    await markAllNotificationsReadByUser(db, {
      userId: context.userId,
    });

    return { success: true };
  });
