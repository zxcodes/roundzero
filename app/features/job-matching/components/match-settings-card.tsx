import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatRelativeTime } from "@/shared/date";

import { refreshMyCandidateMatches, updateMyMatchAlerts } from "../server/functions";

export function MatchSettingsCard({
  alertsEnabled,
  feedStatus,
  refreshedAt,
  hasResume,
}: {
  alertsEnabled: boolean;
  feedStatus: string;
  refreshedAt: Date | null;
  hasResume: boolean;
}) {
  const alertsId = useId();
  const router = useRouter();
  const updateAlertsFn = useServerFn(updateMyMatchAlerts);
  const refreshFn = useServerFn(refreshMyCandidateMatches);
  const alertsMutation = useMutation({
    mutationFn: updateAlertsFn,
    onSuccess: async (result) => {
      toast.success(result.enabled ? "Daily match emails enabled" : "Daily match emails disabled");
      await router.invalidate();
    },
    onError: () => toast.error("Could not update match emails."),
  });
  const refreshMutation = useMutation({
    mutationFn: refreshFn,
    onSuccess: async () => {
      toast.success("Refreshing your job matches");
      await router.invalidate();
    },
    onError: () => toast.error("Could not refresh job matches."),
  });

  const onAlertsChange = (checked: boolean | "indeterminate") => {
    alertsMutation.mutate({ data: { enabled: checked === true } });
  };
  const onRefresh = () => refreshMutation.mutate({});

  return (
    <Card variant="bordered" size="sm">
      <CardHeader className="pt-4">
        <CardTitle>Job matching</CardTitle>
        <p className="text-sm text-muted-foreground">
          Control personalized matches based on your resume.
        </p>
        <CardAction>
          <Badge variant="secondary" className="capitalize">
            {feedStatus}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">
        <label htmlFor={alertsId} className="flex items-start gap-3">
          <Checkbox
            id={alertsId}
            checked={alertsEnabled}
            onCheckedChange={onAlertsChange}
            disabled={alertsMutation.isPending}
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Daily strong-match email</span>
            <span className="text-xs text-muted-foreground">
              One digest when new, unviewed strong matches are available.
            </span>
          </span>
        </label>
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {refreshedAt
              ? `Last refreshed ${formatRelativeTime(refreshedAt)}`
              : "No completed refresh yet"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={!hasResume || refreshMutation.isPending}
          >
            <HugeiconsIcon
              icon={Loading03Icon}
              strokeWidth={2}
              data-icon="inline-start"
              className={refreshMutation.isPending ? "animate-spin" : undefined}
            />
            Refresh now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
