import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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

  const onLeaveTeam = () => {
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
        <Button
          type="button"
          variant="outline"
          disabled={leaveMutation.isPending}
          onClick={onLeaveTeam}
        >
          <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
          Leave team
        </Button>
      </CardContent>
    </Card>
  );
}
