import {
  Briefcase01Icon,
  Clock01Icon,
  Location01Icon,
  MoneyBag02Icon,
  RankingIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { DashboardJobDetailSkeleton } from "@/components/route-skeletons";
import { Separator } from "@/components/ui/separator";
import { CandidateApplySection } from "@/features/applications/components/candidate-apply-section";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { formatDate, formatDaysLeft } from "@/shared/date";
import {
  type EmploymentType,
  type ExperienceLevel,
  employmentTypeLabels,
  experienceLevelLabels,
  type WorkplaceType,
  workplaceTypeLabels,
} from "@/shared/enums";
import { formatSalaryFull } from "@/shared/format";

import { Route as ParentRoute } from "../$jobId";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/$jobId/")({
  beforeLoad: ({ context, params }) => {
    if (context.isCompany) {
      throw redirect({
        to: "/dashboard/job-applicants/$jobId",
        params: { jobId: params.jobId },
      });
    }
  },
  pendingComponent: DashboardJobDetailSkeleton,
  component: JobDetailPage,
});

function JobDetailPage() {
  const data = ParentRoute.useLoaderData();
  if (data.type !== "candidate") {
    return null;
  }
  const { job, alreadyApplied, candidateProfile } = data;

  const requirements: string[] = Array.isArray(job.requirements) ? job.requirements : [];
  const salary = formatSalaryFull(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <div className="space-y-6">
      <section className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{job.title}</h1>
          <JobStatusBadge job={job} />
        </div>
        <p className="text-sm text-muted-foreground">
          {job.companyName ? (
            <>
              <Link
                to="/companies/$slug"
                params={{ slug: job.companySlug }}
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                {job.companyName}
              </Link>
              {" \u00B7 "}
            </>
          ) : null}
          <span className="font-mono">{formatDate(job.createdAt)}</span>
          {new Date(job.updatedAt).getTime() !== new Date(job.createdAt).getTime() ? (
            <>
              {" "}
              · Updated <span className="font-mono">{formatDate(job.updatedAt)}</span>
            </>
          ) : null}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="space-y-3 rounded-2xl bg-muted/30 px-5 py-4 md:px-6">
            <h2 className="text-lg font-semibold tracking-tight">Description</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </section>

          {requirements.length > 0 ? (
            <section className="space-y-3 rounded-2xl bg-muted/30 px-5 py-4 md:px-6">
              <h2 className="text-lg font-semibold tracking-tight">Requirements</h2>
              <ul className="space-y-2">
                {requirements.map((req, i) => (
                  <li key={`${req}-${i}`} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-2 block size-1 shrink-0 rounded-full bg-primary" />
                    {req}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
            <h2 className="text-sm font-semibold tracking-tight">Job details</h2>

            {job.location ? (
              <div className="flex items-start gap-3">
                <HugeiconsIcon
                  icon={Location01Icon}
                  strokeWidth={2}
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <div>
                  <p className="text-sm font-medium">{job.location}</p>
                  {job.workplaceType ? (
                    <p className="text-xs text-muted-foreground">
                      {workplaceTypeLabels[job.workplaceType as WorkplaceType]}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {job.employmentType ? (
              <div className="flex items-center gap-3">
                <HugeiconsIcon
                  icon={Briefcase01Icon}
                  strokeWidth={2}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <p className="text-sm">
                  {employmentTypeLabels[job.employmentType as EmploymentType]}
                </p>
              </div>
            ) : null}

            {job.experienceLevel ? (
              <div className="flex items-center gap-3">
                <HugeiconsIcon
                  icon={RankingIcon}
                  strokeWidth={2}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <p className="text-sm">
                  {experienceLevelLabels[job.experienceLevel as ExperienceLevel]}
                </p>
              </div>
            ) : null}

            {salary ? (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <HugeiconsIcon
                    icon={MoneyBag02Icon}
                    strokeWidth={2}
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <div>
                    <p className="font-mono text-sm font-medium">{salary}</p>
                    <p className="text-xs text-muted-foreground">Annual compensation</p>
                  </div>
                </div>
              </>
            ) : null}

            {job.teamSize || job.headcount ? (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <HugeiconsIcon
                    icon={UserGroupIcon}
                    strokeWidth={2}
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <div className="space-y-0.5">
                    {job.teamSize ? (
                      <p className="text-sm">
                        <span className="font-mono font-medium">{job.teamSize}</span> people on team
                      </p>
                    ) : null}
                    {job.headcount ? (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{job.headcount}</span> open{" "}
                        {job.headcount === 1 ? "position" : "positions"}
                      </p>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}

            <Separator />
            <div className="flex items-start gap-3">
              <HugeiconsIcon
                icon={UserGroupIcon}
                strokeWidth={2}
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div>
                <p className="text-sm font-medium">
                  {job.applicantCount} {job.applicantCount === 1 ? "applicant" : "applicants"}
                </p>
                <p className="text-xs text-muted-foreground">Total applications</p>
              </div>
            </div>

            {job.expiresAt ? (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    strokeWidth={2}
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <div>
                    <p className="text-sm font-medium">{formatDaysLeft(job.expiresAt)}</p>
                    <p className="text-xs text-muted-foreground">Application deadline</p>
                  </div>
                </div>
              </>
            ) : null}
          </section>

          {job.status === "open" ? (
            <CandidateApplySection
              jobId={job.id}
              jobTitle={job.title}
              companyName={job.companyName ?? "the company"}
              alreadyApplied={alreadyApplied}
              hasResume={Boolean(candidateProfile?.resumeKey)}
            />
          ) : (
            <section className="rounded-3xl border border-border/60 px-5 py-4 md:px-6">
              <p className="text-sm font-semibold text-muted-foreground">
                No longer accepting applications
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {job.status === "closed"
                  ? "This position has been closed by the company."
                  : "This job is currently in draft status."}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
