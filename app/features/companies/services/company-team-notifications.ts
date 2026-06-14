import type { Sql } from "postgres";
import { listCompanyNotificationRecipients } from "@/features/companies/queries/queries_sql";
import {
  createNotification,
  type createNotificationRow,
} from "@/features/notifications/queries/queries_sql";

export type CompanyTeamNotificationDelivery = {
  notification: createNotificationRow;
  userId: string;
  email: string;
};

export async function notifyCompanyTeam(
  sql: Sql,
  input: {
    companyId: string;
    type: string;
    payload: unknown;
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
