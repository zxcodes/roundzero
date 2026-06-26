import { Loading03Icon, Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { leaveCompany } from "@/features/companies/server/team-functions";

export function CompanyLeaveSection() {
  const router = useRouter();
  const leaveFn = useServerFn(leaveCompany);

  const leaveMutation = useMutation({
    mutationFn: leaveFn,
    onSuccess: async () => {
      toast.success("You left the team.");
      await router.navigate({ to: "/company/login" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to leave team.");
    },
  });

  const onConfirmLeave = () => {
    leaveMutation.mutate({});
  };

  return (
    <section className="space-y-4 rounded-3xl border border-destructive/30 px-5 py-4 md:px-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">Leave team</h2>
        <p className="text-sm text-muted-foreground">
          Remove your access to this company workspace. You can rejoin if invited again.
        </p>
      </div>
      <div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={leaveMutation.isPending}>
              {leaveMutation.isPending ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
              ) : (
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
              )}
              {leaveMutation.isPending ? "Leaving..." : "Leave team"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave this team?</AlertDialogTitle>
              <AlertDialogDescription>
                You will lose access to this company workspace. An admin can invite you again later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirmLeave} disabled={leaveMutation.isPending}>
                {leaveMutation.isPending ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                ) : null}
                {leaveMutation.isPending ? "Leaving..." : "Leave team"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
