import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Briefcase01Icon,
  Building01Icon,
  Clock01Icon,
  Location01Icon,
  MoneyBag02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { JobDetailSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandidateApplySection } from "@/features/applications/components/candidate-apply-section";
import { hasApplied } from "@/features/applications/server/functions";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { getPublicJobById } from "@/features/jobs/server/functions";
import type { EmploymentType, ExperienceLevel, WorkplaceType } from "@/shared/enums";
import { employmentTypeLabels, experienceLevelLabels, workplaceTypeLabels } from "@/shared/enums";

export const Route = createFileRoute("/jobs/$jobId")({
  loader: async ({ params, context }) => {
    const job = await getPublicJobById({ data: { id: params.jobId } });

    const [alreadyApplied, candidateProfile] =
      context.isCandidate && job.status === "open"
        ? await Promise.all([
            hasApplied({ data: { jobId: params.jobId } }),
            getMyCandidateProfile(),
          ])
        : [false, null];

    return { job, alreadyApplied, candidateProfile };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.job
          ? `${loaderData.job.title} at ${loaderData.job.companyName} | RoundZero`
          : "Job Not Found | RoundZero",
      },
    ],
  }),
  pendingComponent: JobDetailSkeleton,
  component: JobDetailPage,
});

function JobDetailPage() {
  const { job, alreadyApplied, candidateProfile } = Route.useLoaderData();
  const { isCandidate, isCompany } = useRouteContext({ from: "__root__" });

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const requirements: string[] = Array.isArray(job.requirements) ? job.requirements : [];
  const postedDate = new Date(job.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const dashboardJobPath = `/dashboard/jobs/${job.id}`;
  const canApply = isCandidate && job.status === "open";
  const hasResume = Boolean(candidateProfile?.resumeKey);

  return (
    <div className="bg-background text-foreground min-h-svh">
      <PublicHeader />

      <main>
        {/* Header section */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/5%,transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-6 lg:px-8 lg:pb-12">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
              All jobs
            </Link>

            <div className="animate-fade-in mt-8 space-y-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {job.title}
                  </h1>
                  <Link
                    to="/companies/$slug"
                    params={{ slug: job.companySlug }}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <HugeiconsIcon icon={Building01Icon} strokeWidth={2} className="size-4" />
                    {job.companyName}
                  </Link>
                </div>

                {!isCompany ? (
                  <div className="shrink-0">
                    <PublicJobCTA
                      isCandidate={isCandidate}
                      dashboardJobPath={dashboardJobPath}
                      canApply={canApply}
                      alreadyApplied={alreadyApplied}
                      hasResume={hasResume}
                      job={job}
                    />
                  </div>
                ) : null}
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-2">
                {job.employmentType ? (
                  <Badge variant="secondary" className="gap-1">
                    <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3" />
                    {employmentTypeLabels[job.employmentType as EmploymentType] ??
                      job.employmentType}
                  </Badge>
                ) : null}
                {job.experienceLevel ? (
                  <Badge variant="secondary">
                    {experienceLevelLabels[job.experienceLevel as ExperienceLevel] ??
                      job.experienceLevel}
                  </Badge>
                ) : null}
                {job.workplaceType ? (
                  <Badge variant="outline">
                    {workplaceTypeLabels[job.workplaceType as WorkplaceType] ?? job.workplaceType}
                  </Badge>
                ) : null}
                {job.location ? (
                  <Badge variant="outline" className="gap-1">
                    <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3" />
                    {job.location}
                  </Badge>
                ) : null}
                {salary ? (
                  <Badge variant="outline" className="gap-1">
                    <HugeiconsIcon icon={MoneyBag02Icon} strokeWidth={2} className="size-3" />
                    {salary}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-8 lg:grid-cols-3 lg:px-8 lg:py-12">
          {/* Left column — description & requirements */}
          <div className="space-y-10 lg:col-span-2">
            {job.description ? (
              <div className="animate-fade-in space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Description
                </h2>
                <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {job.description}
                </div>
              </div>
            ) : null}

            {requirements.length > 0 ? (
              <div className="animate-fade-in stagger-1 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Requirements
                </h2>
                <ul className="space-y-2.5">
                  {requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm leading-relaxed text-foreground/90"
                    >
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Bottom CTA */}
            {!isCompany ? (
              <div className="animate-fade-in stagger-2 rounded-xl border border-dashed border-primary/20 bg-primary/5 p-6 text-center">
                <PublicJobCTA
                  isCandidate={isCandidate}
                  dashboardJobPath={dashboardJobPath}
                  canApply={canApply}
                  alreadyApplied={alreadyApplied}
                  hasResume={hasResume}
                  job={job}
                  variant="bottom"
                />
              </div>
            ) : null}
          </div>

          {/* Right sidebar */}
          <aside className="space-y-4">
            {/* Job details card */}
            <Card>
              <CardContent className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Job details
                </h3>
                {salary ? <DetailRow icon={MoneyBag02Icon} label="Salary" value={salary} /> : null}
                {job.teamSize ? (
                  <DetailRow
                    icon={UserGroupIcon}
                    label="Team size"
                    value={`${job.teamSize} ${job.teamSize === 1 ? "person" : "people"}`}
                  />
                ) : null}
                {job.headcount ? (
                  <DetailRow
                    icon={Briefcase01Icon}
                    label="Openings"
                    value={`${job.headcount} ${job.headcount === 1 ? "position" : "positions"}`}
                  />
                ) : null}
                <DetailRow icon={Clock01Icon} label="Posted" value={postedDate} />
              </CardContent>
            </Card>

            {/* Company link */}
            <Link to="/companies/$slug" params={{ slug: job.companySlug }}>
              <Card className="group transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                    {job.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                      {job.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground">View company profile</p>
                  </div>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
                  />
                </CardContent>
              </Card>
            </Link>
          </aside>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function PublicJobCTA({
  isCandidate,
  dashboardJobPath,
  canApply,
  alreadyApplied,
  hasResume,
  job,
  variant = "header",
}: {
  isCandidate: boolean;
  dashboardJobPath: string;
  canApply: boolean;
  alreadyApplied: boolean;
  hasResume: boolean;
  job: { id: string; title: string; companyName: string | null };
  variant?: "header" | "bottom";
}) {
  if (canApply && alreadyApplied) {
    return (
      <div className={variant === "bottom" ? "space-y-3" : ""}>
        {variant === "bottom" ? (
          <>
            <p className="text-sm font-medium">Application submitted</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Track your application status and updates from your dashboard.
            </p>
          </>
        ) : null}
        <Button size={variant === "header" ? "lg" : "default"} variant="outline" asChild>
          <Link to={dashboardJobPath}>
            {variant === "header" ? "View in dashboard" : "View application"}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-1.5 size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (canApply && !hasResume) {
    return (
      <div className={variant === "bottom" ? "space-y-3" : ""}>
        {variant === "bottom" ? (
          <>
            <p className="text-sm font-medium">Interested in this role?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a resume to your profile to apply.
            </p>
          </>
        ) : null}
        <Button size={variant === "header" ? "lg" : "default"} asChild>
          <Link to="/dashboard/settings">
            {variant === "header" ? "Add resume" : "Add resume to apply"}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-1.5 size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (canApply && hasResume) {
    return (
      <div className={variant === "bottom" ? "space-y-3" : ""}>
        {variant === "bottom" ? (
          <>
            <p className="text-sm font-medium">Apply with one click</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Uses the resume from your profile. No cover letter needed.
            </p>
          </>
        ) : null}
        <CandidateApplySection
          jobId={job.id}
          jobTitle={job.title}
          companyName={job.companyName ?? "the company"}
          alreadyApplied={alreadyApplied}
          hasResume={hasResume}
        />
      </div>
    );
  }

  if (isCandidate) {
    return (
      <div className={variant === "bottom" ? "space-y-3" : ""}>
        {variant === "bottom" ? (
          <>
            <p className="text-sm font-medium">Interested in this role?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              View this job in your dashboard to apply and interview.
            </p>
          </>
        ) : null}
        <Button size={variant === "header" ? "lg" : "default"} asChild>
          <Link to={dashboardJobPath}>
            {variant === "header" ? "View in dashboard" : "View in dashboard"}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-1.5 size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={variant === "bottom" ? "space-y-3" : ""}>
      {variant === "bottom" ? (
        <>
          <p className="text-sm font-medium">Interested in this role?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in to apply with one click and interview on your schedule.
          </p>
        </>
      ) : null}
      <Button size={variant === "header" ? "lg" : "default"} asChild>
        <Link to="/candidate/login" search={{ redirect: dashboardJobPath }}>
          {variant === "header" ? "Log in to apply" : "Log in to apply"}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-1.5 size-4" />
        </Link>
      </Button>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: typeof MoneyBag02Icon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5 text-primary/70" />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const formatSalary = (min: number | null, max: number | null, currency: string): string | null => {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  };
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "\u20AC" : `${currency} `;
  if (min && max) return `${sym}${fmt(min)}\u2013${sym}${fmt(max)}`;
  if (min) return `From ${sym}${fmt(min)}`;
  return `Up to ${sym}${fmt(max!)}`;
};
