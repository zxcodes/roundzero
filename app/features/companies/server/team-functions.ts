import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getUserByEmail } from "@/features/auth/queries/queries_sql";
import { sendCompanyInviteEmail } from "@/features/companies/services/invite-email";
import { getDb } from "@/shared/db";
import { companyInvitationRoleSchema } from "@/shared/enums";
import { emailsMatch, normalizeEmail } from "@/shared/google-userinfo";
import { companyMiddleware } from "@/shared/middleware";
import { zodValidatorWithFormattedErrors } from "@/shared/validation";
import {
  createInvitation,
  getActiveMemberByCompanyEmail,
  getActiveMembershipByUserId,
  getInvitationByToken,
  getMembershipById,
  getPendingInvitationByEmail,
  listActiveMembersByCompany,
  listPendingInvitationsByCompany,
  removeCompanyMember,
  resetInvitationForResend,
  revokeInvitation as revokeInvitationQuery,
} from "../queries/queries_sql";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const inviteExpiryAt = () => new Date(Date.now() + INVITE_EXPIRY_MS);

const newInviteToken = () => crypto.randomUUID();

const assertCanManageTeam = (role: string) => {
  if (role !== "owner" && role !== "admin") {
    throw new Error("Not authorized to manage team members");
  }
};

const invitationIdSchema = z.object({
  invitationId: z.string().uuid(),
});

const memberIdSchema = z.object({
  memberId: z.string().uuid(),
});

const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .transform(normalizeEmail),
  role: companyInvitationRoleSchema,
});

const inviteTokenSchema = z.object({
  token: z.string().trim().min(1),
});

export const getInvitationPreview = createServerFn({ method: "GET" })
  .validator(zodValidator(inviteTokenSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    const invitation = await getInvitationByToken(db, { token: data.token });

    if (!invitation) {
      return null;
    }

    if (invitation.acceptedAt || invitation.revokedAt) {
      return null;
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return {
      companyName: invitation.companyName,
      email: invitation.email,
      role: invitation.role,
    };
  });

export const getTeamOverview = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .handler(async ({ context }) => {
    assertCanManageTeam(context.membership.role);

    const db = getDb();
    const [members, invitations] = await Promise.all([
      listActiveMembersByCompany(db, { companyId: context.company.id }),
      listPendingInvitationsByCompany(db, { companyId: context.company.id }),
    ]);

    return { members, invitations };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidatorWithFormattedErrors(inviteMemberSchema))
  .handler(async ({ data, context }) => {
    assertCanManageTeam(context.membership.role);

    if (emailsMatch(data.email, context.user.email)) {
      throw new Error("You cannot invite yourself");
    }

    const db = getDb();

    const existingMember = await getActiveMemberByCompanyEmail(db, {
      companyId: context.company.id,
      email: data.email,
    });
    if (existingMember) {
      throw new Error("This person is already a team member");
    }

    const pendingInvite = await getPendingInvitationByEmail(db, {
      companyId: context.company.id,
      email: data.email,
    });
    if (pendingInvite) {
      throw new Error("An invitation is already pending for this email");
    }

    const existingUser = await getUserByEmail(db, { email: data.email });
    if (existingUser) {
      if (existingUser.role === "candidate") {
        throw new Error("This email is registered as a candidate account");
      }

      const otherMembership = await getActiveMembershipByUserId(db, {
        userId: existingUser.id,
      });
      if (otherMembership) {
        throw new Error("This person already belongs to a company");
      }
    }

    const token = newInviteToken();
    const expiresAt = inviteExpiryAt();

    const invitation = await createInvitation(db, {
      companyId: context.company.id,
      email: data.email,
      role: data.role,
      token,
      invitedBy: context.userId,
      expiresAt,
    });

    if (!invitation) {
      throw new Error("Failed to create invitation");
    }

    await sendCompanyInviteEmail({
      to: data.email,
      companyName: context.company.name,
      inviterName: context.user.name,
      role: data.role,
      token,
    });

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    };
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(invitationIdSchema))
  .handler(async ({ data, context }) => {
    assertCanManageTeam(context.membership.role);

    const db = getDb();
    const revoked = await revokeInvitationQuery(db, {
      id: data.invitationId,
      companyId: context.company.id,
    });

    if (!revoked) {
      throw new Error("Invitation not found or already handled");
    }

    return {};
  });

export const resendInvitation = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(invitationIdSchema))
  .handler(async ({ data, context }) => {
    assertCanManageTeam(context.membership.role);

    const db = getDb();
    const token = newInviteToken();
    const expiresAt = inviteExpiryAt();

    const updated = await resetInvitationForResend(db, {
      id: data.invitationId,
      companyId: context.company.id,
      token,
      expiresAt,
    });

    if (!updated) {
      throw new Error("Invitation not found or already handled");
    }

    await sendCompanyInviteEmail({
      to: updated.email,
      companyName: context.company.name,
      inviterName: context.user.name,
      role: updated.role as "admin" | "member",
      token: updated.token,
    });

    return { expiresAt };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(memberIdSchema))
  .handler(async ({ data, context }) => {
    assertCanManageTeam(context.membership.role);

    const db = getDb();
    const target = await getMembershipById(db, { id: data.memberId });

    if (!target || target.companyId !== context.company.id || target.status !== "active") {
      throw new Error("Team member not found");
    }

    if (target.role === "owner") {
      throw new Error("Cannot remove the company owner");
    }

    if (target.userId === context.userId) {
      throw new Error("You cannot remove yourself from the team");
    }

    const removed = await removeCompanyMember(db, {
      id: data.memberId,
      companyId: context.company.id,
    });

    if (!removed) {
      throw new Error("Failed to remove team member");
    }

    return {};
  });
