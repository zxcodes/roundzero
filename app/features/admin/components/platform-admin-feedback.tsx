import { ChatFeedback01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { getPlatformAdminFeedback } from "@/features/admin/server/functions";
import { formatDateTime } from "@/shared/date";

type PlatformAdminFeedback = NonNullable<Awaited<ReturnType<typeof getPlatformAdminFeedback>>>;
type FeedbackItem = PlatformAdminFeedback["items"][number];

const feedbackTypeLabels = {
  bug: "Bug report",
  feature: "Feature request",
  general: "General feedback",
} as const;

const feedbackTypeVariant = {
  bug: "destructive",
  feature: "default",
  general: "secondary",
} as const satisfies Record<
  keyof typeof feedbackTypeLabels,
  "destructive" | "default" | "secondary"
>;

const roleLabels = {
  company: "Company",
  candidate: "Candidate",
} as const;

function FeedbackTypeBadge({ type }: { type: string }) {
  const label = feedbackTypeLabels[type as keyof typeof feedbackTypeLabels] ?? type;
  const variant = feedbackTypeVariant[type as keyof typeof feedbackTypeVariant] ?? "outline";

  return (
    <Badge variant={variant} className="capitalize">
      {label}
    </Badge>
  );
}

function FeedbackRoleBadge({ role }: { role: string }) {
  const label = roleLabels[role as keyof typeof roleLabels] ?? role;

  return (
    <Badge variant="outline" className="capitalize">
      {label}
    </Badge>
  );
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  return (
    <Card variant="bordered-inset" className="gap-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <FeedbackTypeBadge type={item.type} />
          <FeedbackRoleBadge role={item.role} />
        </div>
        <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              From
            </p>
            <p className="text-sm font-medium">{item.userName}</p>
            <p className="text-sm text-muted-foreground">{item.userEmail}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Company
            </p>
            {item.companyName && item.companySlug ? (
              <Link
                to="/companies/$slug"
                params={{ slug: item.companySlug }}
                className="text-sm font-medium hover:text-primary"
              >
                {item.companyName}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Message
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.message}</p>
        </div>
      </div>
    </Card>
  );
}

export function PlatformAdminFeedback({ data }: { data: PlatformAdminFeedback }) {
  const pageStart = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const pageEnd = Math.min(data.page * data.pageSize, data.total);

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Feedback</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Product feedback submitted from the in-app sidebar form.
        </p>
      </section>

      <p className="text-xs font-medium text-muted-foreground">
        {data.total} {data.total === 1 ? "submission" : "submissions"}
        {data.total > 0 ? ` · showing ${pageStart}–${pageEnd}` : null}
      </p>

      {data.items.length === 0 ? (
        <Empty className="rounded-2xl border-0 bg-muted/30">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={ChatFeedback01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No feedback yet</EmptyTitle>
            <EmptyDescription>Submissions from the sidebar form will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {data.items.map((item) => (
            <FeedbackCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <PaginationNav currentPage={data.page} totalPages={data.totalPages} className="pt-2" />
    </div>
  );
}
