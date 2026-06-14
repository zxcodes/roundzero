import type { Sql } from "postgres";
import type { z } from "zod";
import { listCompanyNotificationRecipients } from "@/features/companies/queries/membership-queries_sql";
import {
  createNotification,
  type createNotificationRow,
} from "@/features/notifications/queries/queries_sql";
import type { notificationPayloadSchemas } from "@/shared/notifications-config";

type NotificationType = keyof typeof notificationPayloadSchemas;
type NotificationPayload<T extends NotificationType> = z.infer<
  (typeof notificationPayloadSchemas)[T]
>;

export type CompanyTeamNotificationDelivery = {
  notification: createNotificationRow;
  userId: string;
  email: string;
};

export async function notifyCompanyTeam<T extends NotificationType>(
  sql: Sql,
  input: {
    companyId: string;
    type: T;
    payload: NotificationPayload<T>;
  },
): Promise<CompanyTeamNotificationDelivery[]> {
  const recipients = await listCompanyNotificationRecipients(sql, {
    companyId: input.companyId,
  });

  const deliveries: CompanyTeamNotificationDelivery[] = [];

  for (const recipient of recipients) {
    const notification = await createNotification(sql, {
      userId: recipient.userId,
      type: input.type,
      payload: input.payload,
    });

    if (notification) {
      deliveries.push({
        notification,
        userId: recipient.userId,
        email: recipient.email,
      });
    }
  }

  return deliveries;
}
