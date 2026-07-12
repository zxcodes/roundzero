import { CheckmarkCircle02Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { differenceInDays } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { formatDaysLeft } from "@/shared/date";

const SOON_THRESHOLD_DAYS = 7;

export function isJobClosingSoon(job: { status: string; expiresAt: Date | null }): boolean {
  if (job.status !== "open" || !job.expiresAt) return false;
  const days = differenceInDays(job.expiresAt, new Date());
  return days >= 0 && days <= SOON_THRESHOLD_DAYS;
}

export function JobStatusBadge({
  job,
  className,
}: {
  job: { status: string; expiresAt: Date | null };
  className?: string;
}) {
  if (job.status === "draft") {
    return (
      <Badge variant="secondary" className={`capitalize ${className ?? ""}`}>
        Draft
      </Badge>
    );
  }

  if (job.status !== "open") {
    return (
      <Badge variant="outline" className={`capitalize ${className ?? ""}`}>
        {job.status}
      </Badge>
    );
  }

  const closingSoon = isJobClosingSoon(job);
  const closingLabel = formatDaysLeft(job.expiresAt);

  return (
    <Badge variant={closingSoon ? "destructive" : "default"} className={`gap-1 ${className ?? ""}`}>
      <HugeiconsIcon
        icon={closingSoon ? Clock01Icon : CheckmarkCircle02Icon}
        strokeWidth={2}
        className="size-3"
      />
      {closingSoon && closingLabel ? closingLabel : "Active"}
    </Badge>
  );
}
