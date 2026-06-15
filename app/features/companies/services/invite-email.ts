import { env } from "cloudflare:workers";
import { jsx } from "react/jsx-runtime";
import { Resend } from "resend";
import { CompanyInviteEmailTemplate } from "@/features/companies/components/company-invite-email-template";
import type { CompanyInvitationRole } from "@/shared/enums";

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
  const resendApiKey = env.RESEND_API_KEY;
  const resendFromEmail = env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFromEmail) {
    throw new Error("Email delivery is not configured");
  }

  const appUrl = env.APP_URL ?? "";
  const inviteUrl = appUrl
    ? new URL(`/invite/${input.token}`, appUrl).toString()
    : `/invite/${input.token}`;

  const resend = new Resend(resendApiKey);
  const response = await resend.emails.send({
    from: `RoundZero <${resendFromEmail}>`,
    to: input.to,
    subject: `You're invited to join ${input.companyName} on RoundZero`,
    react: jsx(CompanyInviteEmailTemplate, {
      companyName: input.companyName,
      inviterName: input.inviterName,
      roleLabel: roleLabels[input.role],
      inviteUrl,
    }),
  });

  if (response.error) {
    throw new Error(response.error.message);
  }
}
