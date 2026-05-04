import {
  BubbleChatIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Message01Icon,
  Rocket01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatTimeLeft } from "@/shared/date";

const formatInterviewStatusLabel = (status: string) => {
  return status.replace(/_/g, " ");
};

type InterviewInvitationCardProps = {
  interviewId: string;
  interviewType: string;
  status: string;
  expiresAt?: Date | null;
};

export function InterviewInvitationCard({
  interviewId,
  interviewType,
  status,
  expiresAt,
}: InterviewInvitationCardProps) {
  const isFull = interviewType === "full";
  const estimatedDuration = isFull ? "15–20 min" : "5 min";
  const formatLabel = isFull ? "Full evaluation" : "Quick evaluation";
  const timeLeft = formatTimeLeft(expiresAt ?? null);
  const deadline = formatDateTime(expiresAt ?? null);

  const isActionable = status === "pending" || status === "in_progress";

  const statusConfig: Record<
    string,
    { label: string; icon: typeof CheckmarkCircle02Icon; tone: string }
  > = {
    pending: { label: "Ready", icon: Rocket01Icon, tone: "text-primary" },
    in_progress: { label: "In progress", icon: Clock01Icon, tone: "text-primary" },
    completed: { label: "Completed", icon: CheckmarkCircle02Icon, tone: "text-success" },
    expired: { label: "Expired", icon: Cancel01Icon, tone: "text-warning" },
    cancelled: { label: "Cancelled", icon: Cancel01Icon, tone: "text-muted-foreground" },
  };

  const config = statusConfig[status] ?? {
    label: status,
    icon: Message01Icon,
    tone: "text-foreground",
  };

  return (
    <Card className="border border-primary/10 bg-[radial-gradient(circle_at_top_left,var(--color-primary)/10,transparent_32%),var(--color-card)] shadow-lg shadow-primary/5">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-5 text-primary" />
          <p className="text-sm font-medium">RoundZero interview</p>
          <Badge variant="outline" className="gap-1 text-[11px]">
            <HugeiconsIcon icon={config.icon} strokeWidth={2} className={`size-3 ${config.tone}`} />
            {formatInterviewStatusLabel(status)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3" />~
            {estimatedDuration}
          </span>
          <span className="inline-flex items-center gap-1">
            <HugeiconsIcon icon={Message01Icon} strokeWidth={2} className="size-3" />
            {formatLabel}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          {status === "completed"
            ? "Your interview is complete. The company will review your evaluation."
            : status === "expired"
              ? "This interview window has expired."
              : status === "cancelled"
                ? "This interview has been cancelled."
                : "Complete your RoundZero interview to advance your application."}
        </p>

        {status === "pending" && timeLeft && deadline ? (
          <div className="rounded-md border border-warning/20 bg-warning/10 px-2.5 py-2 text-xs text-warning">
            <p className="font-medium">{timeLeft}</p>
            <p className="mt-0.5">Deadline: {deadline}</p>
          </div>
        ) : null}

        {isActionable ? (
          <Button size="sm" asChild>
            <Link to="/interview/$interviewId" params={{ interviewId }}>
              {status === "in_progress" ? "Continue interview" : "Start interview"}
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
