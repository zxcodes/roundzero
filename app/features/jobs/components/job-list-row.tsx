import { ArrowRight01Icon, Location01Icon, MoneyBag02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useNavigate } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import type { EmploymentType, ExperienceLevel, WorkplaceType } from "@/shared/enums";
import { employmentTypeLabels, experienceLevelLabels, workplaceTypeLabels } from "@/shared/enums";
import { formatSalary } from "@/shared/format";

export type JobListRowData = {
  id: string;
  title: string;
  companyName?: string | null;
  companySlug?: string;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  description?: string | null;
  employmentType?: string | null;
  experienceLevel?: string | null;
  workplaceType?: string | null;
};

type JobListRowProps = {
  job: JobListRowData;
  jobTo: "/jobs/$jobId" | "/dashboard/jobs/$jobId";
  showCompanyName?: boolean;
  linkCompanyToProfile?: boolean;
  badge?: React.ReactNode;
  details?: React.ReactNode;
  actions?: React.ReactNode;
  onOpen?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

export function JobListRow({
  job,
  jobTo,
  showCompanyName = false,
  linkCompanyToProfile = false,
  badge,
  details,
  actions,
  onOpen,
}: JobListRowProps) {
  const navigate = useNavigate();
  const salary = formatSalary(
    job.salaryMin ?? null,
    job.salaryMax ?? null,
    job.salaryCurrency ?? "USD",
  );
  const hasMeta = Boolean(job.location) || Boolean(salary);
  const hasBadges =
    Boolean(job.employmentType) || Boolean(job.experienceLevel) || Boolean(job.workplaceType);

  const onCompanyClick = (e: React.MouseEvent) => {
    if (!job.companySlug) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    void navigate({ to: "/companies/$slug", params: { slug: job.companySlug } });
  };

  const onCompanyKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      onCompanyClick(e as unknown as React.MouseEvent);
    }
  };

  const description =
    details ??
    (job.description ? (
      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {job.description}
      </p>
    ) : null);

  return (
    <div className="group transition-colors hover:bg-muted/40">
      <Link
        to={jobTo}
        params={{ jobId: job.id }}
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start gap-4 px-5 py-4 no-underline hover:no-underline md:px-6 md:py-5"
      >
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1.5">
            <p className="truncate text-base font-semibold tracking-tight group-hover:text-primary">
              {job.title}
            </p>
            {showCompanyName && job.companyName ? (
              linkCompanyToProfile && job.companySlug ? (
                <span
                  role="link"
                  tabIndex={0}
                  onClick={onCompanyClick}
                  onKeyDown={onCompanyKeyDown}
                  className="block cursor-pointer truncate text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {job.companyName}
                </span>
              ) : (
                <p className="truncate text-sm text-muted-foreground">{job.companyName}</p>
              )
            ) : null}
          </div>

          {hasMeta ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {job.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3.5" />
                  {job.location}
                </span>
              ) : null}
              {salary ? (
                <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-foreground">
                  <HugeiconsIcon
                    icon={MoneyBag02Icon}
                    strokeWidth={2}
                    className="size-3.5 text-muted-foreground"
                  />
                  {salary}
                </span>
              ) : null}
            </div>
          ) : null}

          {description}

          {hasBadges ? (
            <div className="flex flex-wrap gap-2">
              {job.employmentType ? (
                <Badge variant="secondary" className="text-[11px]">
                  {employmentTypeLabels[job.employmentType as EmploymentType] ?? job.employmentType}
                </Badge>
              ) : null}
              {job.experienceLevel ? (
                <Badge variant="secondary" className="text-[11px]">
                  {experienceLevelLabels[job.experienceLevel as ExperienceLevel] ??
                    job.experienceLevel}
                </Badge>
              ) : null}
              {job.workplaceType ? (
                <Badge variant="outline" className="text-[11px]">
                  {workplaceTypeLabels[job.workplaceType as WorkplaceType] ?? job.workplaceType}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {badge}
          {actions ? null : (
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
            />
          )}
        </div>
      </Link>
      {actions ? (
        <div className="-mt-2 flex items-center justify-end gap-2 px-5 pb-4 md:px-6 md:pb-5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
