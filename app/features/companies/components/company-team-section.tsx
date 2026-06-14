import { Loading03Icon, Mail01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type getTeamOverview,
  inviteMember,
  removeMember,
  resendInvitation,
  revokeInvitation,
  transferOwnership,
} from "@/features/companies/server/team-functions";
import { formatDate } from "@/shared/date";
import type { companyInvitationRoleSchema } from "@/shared/enums";

type TeamOverview = NonNullable<Awaited<ReturnType<typeof getTeamOverview>>>;

const invitationRoleLabels = {
  admin: "Admin",
  member: "Member",
} as const;

const memberRoleLabels = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
} as const;

export function CompanyTeamSection({
  team,
  currentUserId,
  isOwner,
}: {
  team: TeamOverview;
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const emailId = `invite-email-${id}`;
  const roleId = `invite-role-${id}`;

  const inviteFn = useServerFn(inviteMember);
  const revokeFn = useServerFn(revokeInvitation);
  const resendFn = useServerFn(resendInvitation);
  const removeFn = useServerFn(removeMember);
  const transferFn = useServerFn(transferOwnership);

  const inviteMutation = useMutation({
    mutationFn: inviteFn,
    onSuccess: async () => {
      toast.success("Invitation sent.");
      await router.invalidate();
      form.reset();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation.");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeFn,
    onSuccess: async () => {
      toast.success("Invitation revoked.");
      await router.invalidate();
    },
    onError: () => {
      toast.error("Failed to revoke invitation.");
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendFn,
    onSuccess: async () => {
      toast.success("Invitation resent.");
      await router.invalidate();
    },
    onError: () => {
      toast.error("Failed to resend invitation.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFn,
    onSuccess: async () => {
      toast.success("Team member removed.");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove team member.");
    },
  });

  const transferMutation = useMutation({
    mutationFn: transferFn,
    onSuccess: async () => {
      toast.success("Ownership transferred.");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to transfer ownership.");
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
      role: "member" as (typeof companyInvitationRoleSchema.enum)[keyof typeof companyInvitationRoleSchema.enum],
    },
    onSubmit: async ({ value }) => {
      await inviteMutation.mutateAsync({
        data: {
          email: value.email,
          role: value.role,
        },
      });
    },
  });

  const onRevokeInvitation = (invitationId: string) => {
    revokeMutation.mutate({ data: { invitationId } });
  };

  const onResendInvitation = (invitationId: string) => {
    resendMutation.mutate({ data: { invitationId } });
  };

  const onRemoveMember = (memberId: string) => {
    removeMutation.mutate({ data: { memberId } });
  };

  const onTransferOwnership = (memberId: string) => {
    transferMutation.mutate({ data: { memberId } });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite teammate</CardTitle>
          <CardDescription>
            Send an email invitation. They will sign in with Google using the invited address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <form.Field
              name="email"
              validators={{
                onBlur: ({ value }) => {
                  const trimmed = value.trim();
                  if (!trimmed) return { message: "Email is required" };
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                    return { message: "Enter a valid email" };
                  }
                  return undefined;
                },
              }}
            >
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="flex-1">
                    <FieldLabel htmlFor={emailId}>Email</FieldLabel>
                    <Input
                      id={emailId}
                      type="email"
                      placeholder="teammate@company.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="role">
              {(field) => (
                <Field className="w-full sm:w-40">
                  <FieldLabel htmlFor={roleId}>Role</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as "admin" | "member")}
                  >
                    <SelectTrigger id={roleId}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting || inviteMutation.isPending}
                >
                  {isSubmitting || inviteMutation.isPending ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      strokeWidth={2}
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="size-4" />
                  )}
                  Send invite
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending invitations</CardTitle>
          <CardDescription>Outstanding invites waiting to be accepted.</CardDescription>
        </CardHeader>
        <CardContent>
          {team.invitations.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>No pending invitations</EmptyTitle>
                <EmptyDescription>Invite a teammate to collaborate on hiring.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {team.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{invitation.email}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">
                        {invitationRoleLabels[invitation.role as keyof typeof invitationRoleLabels]}
                      </Badge>
                      <span>Expires {formatDate(invitation.expiresAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resendMutation.isPending}
                      onClick={() => onResendInvitation(invitation.id)}
                    >
                      Resend
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={revokeMutation.isPending}
                      onClick={() => onRevokeInvitation(invitation.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>People with access to this company workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {team.members.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>No team members yet</EmptyTitle>
              </EmptyHeader>
              <EmptyContent />
            </Empty>
          ) : (
            <div className="space-y-3">
              {team.members.map((member) => {
                const canRemove = member.role !== "owner" && member.userId !== currentUserId;
                const canTransfer =
                  isOwner && member.role !== "owner" && member.userId !== currentUserId;
                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">{member.userName}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{member.userEmail}</span>
                        <Badge variant="secondary">
                          {memberRoleLabels[member.role as keyof typeof memberRoleLabels]}
                        </Badge>
                      </div>
                    </div>
                    {canRemove || canTransfer ? (
                      <div className="flex shrink-0 gap-2">
                        {canTransfer ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={transferMutation.isPending}
                            onClick={() => onTransferOwnership(member.id)}
                          >
                            Make owner
                          </Button>
                        ) : null}
                        {canRemove ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={removeMutation.isPending}
                            onClick={() => onRemoveMember(member.id)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
