import { Logout01Icon } from "@hugeicons/core-free-icons";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leave team</CardTitle>
        <CardDescription>
          Remove your access to this company workspace. You can rejoin if invited again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={leaveMutation.isPending}>
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
              Leave team
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
                Leave team
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
