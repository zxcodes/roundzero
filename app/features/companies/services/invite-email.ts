import { jsx } from "react/jsx-runtime";

import { CompanyInviteEmailTemplate } from "@/features/companies/components/company-invite-email-template";
import { isEmailDeliveryConfigured, sendReactTransactionalEmail } from "@/shared/email";
import type { CompanyInvitationRole } from "@/shared/enums";
import { appEnv } from "@/shared/env.app";

const roleLabels: Record<CompanyInvitationRole, string> = {
  admin: "Admin",
  member: "Member",
};

type SendCompanyInviteEmailInput = {
  to: string;
  companyName: string;
  inviterName: string;
  role: CompanyInvitationRole;
  token: string;
};

export async function sendCompanyInviteEmail(input: SendCompanyInviteEmailInput): Promise<void> {
  if (!isEmailDeliveryConfigured()) {
    throw new Error("Email delivery is not configured");
  }

  const appUrl = appEnv.APP_URL;
  const inviteUrl = appUrl
    ? new URL(`/invite/${input.token}`, appUrl).toString()
    : `/invite/${input.token}`;

  await sendReactTransactionalEmail({
    to: input.to,
    fromName: "RoundZero",
    subject: `You're invited to join ${input.companyName} on RoundZero`,
    react: jsx(CompanyInviteEmailTemplate, {
      companyName: input.companyName,
      inviterName: input.inviterName,
      roleLabel: roleLabels[input.role],
      inviteUrl,
    }),
  });
}
