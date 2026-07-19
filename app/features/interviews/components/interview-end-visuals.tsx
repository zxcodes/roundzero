import { Cancel01Icon, Clock01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

export type InterviewEndVariant = "completed" | "cancelled" | "expired";

export const interviewEndVisuals: Record<
  InterviewEndVariant,
  {
    icon: typeof Tick01Icon;
    bg: string;
    tone: string;
  }
> = {
  completed: { icon: Tick01Icon, bg: "bg-success/10", tone: "text-success" },
  cancelled: { icon: Cancel01Icon, bg: "bg-muted", tone: "text-muted-foreground" },
  expired: { icon: Clock01Icon, bg: "bg-warning/10", tone: "text-warning" },
};

export function CompletedInterviewBar({
  title,
  description,
  variant = "completed",
}: {
  title: string;
  description: string;
  variant?: InterviewEndVariant;
}) {
  const visual = interviewEndVisuals[variant];

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", visual.bg)}
      >
        <HugeiconsIcon icon={visual.icon} strokeWidth={2} className={cn("size-4", visual.tone)} />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
