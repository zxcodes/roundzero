import {
  Alert02Icon,
  ArrowRight01Icon,
  Briefcase01Icon,
  Clock01Icon,
  Location01Icon,
  MoneyBag02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { PUBLIC_CONTAINER } from "@/components/public-page";
import { JobDetailSkeleton } from "@/components/route-skeletons";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CandidateApplySection } from "@/features/applications/components/candidate-apply-section";
import { hasApplied } from "@/features/applications/server/functions";
import { currentUserQueryKey, getCurrentUser } from "@/features/auth/server/functions";
import { candidateLoginLink } from "@/features/auth/signup-search";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { JobDescriptionMarkdown } from "@/features/jobs/components/job-description-markdown";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { getPublicJobById } from "@/features/jobs/server/functions";
import { cn } from "@/lib/utils";
import { publicJobDetailTrail } from "@/shared/breadcrumb-trails";
import { formatDate, formatDaysLeft } from "@/shared/date";
import type { EmploymentType, ExperienceLevel, WorkplaceType } from "@/shared/enums";
import { employmentTypeLabels, experienceLevelLabels, workplaceTypeLabels } from "@/shared/enums";
import { formatSalaryFull } from "@/shared/format";
import { getPublicAssetUrl } from "@/shared/r2";
import {
  breadcrumbJsonLd,
  buildJobPageSeo,
  buildPageHead,
  jobPostingJsonLd,
  NOINDEX_ROBOTS,
} from "@/shared/seo";
import { validateUuidParams } from "@/shared/validation";

function companyInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const Route = createFileRoute("/jobs/$jobId")({
  beforeLoad: async ({ params, context }) => {
    validateUuidParams({ jobId: params.jobId });
    const user = await context.queryClient.fetchQuery({
      queryKey: currentUserQueryKey,
      queryFn: () => getCurrentUser(),
      staleTime: 30_000,
    });

    return {
      user,
      isCompany: user?.role === "company",
      isCandidate: user?.role === "candidate",
    };
  },
  loader: async ({ params, context }) => {
    const job = await getPublicJobById({ data: { id: params.jobId } });
    if (!job) {
      throw notFound();
    }

    if (context.isCandidate && job.status === "open") {
      const [alreadyApplied, candidateProfile] = await Promise.all([
        hasApplied({ data: { jobId: params.jobId } }),
        getMyCandidateProfile(),
      ]);
      return { type: "candidate" as const, job, alreadyApplied, candidateProfile };
    }

    return { type: "other" as const, job };
  },
  head: ({ loaderData }) => {
    const job = loaderData?.job ?? null;
    if (!job) {
      return buildPageHead({
        title: "Job Not Found | RoundZero",
        description: "This job posting could not be found on RoundZero.",
        path: "/jobs",
        robots: NOINDEX_ROBOTS,
      });
    }

    const { title, description } = buildJobPageSeo(job);
    const isClosed = job.status !== "open";
    const jobSchema = jobPostingJsonLd(job);

    return buildPageHead({
      title,
      description,
      path: `/jobs/${job.id}`,
      ogType: "article",
      robots: isClosed ? NOINDEX_ROBOTS : undefined,
      scripts: isClosed
        ? undefined
        : [
            ...(jobSchema ? [jobSchema] : []),
            breadcrumbJsonLd([
              { name: "Jobs", path: "/jobs" },
              { name: job.title, path: `/jobs/${job.id}` },
            ]),
          ],
    });
  },
  pendingComponent: JobDetailSkeleton,
  component: JobDetailPage,
});

function JobDetailPage() {
  const data = Route.useLoaderData();
  const { job } = data;
  const isCandidate = data.type === "candidate";
  const alreadyApplied = isCandidate ? data.alreadyApplied : false;
  const candidateProfile = isCandidate ? data.candidateProfile : null;
  const { user, isCompany } = Route.useRouteContext();

  const salary = formatSalaryFull(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const postedDate = formatDate(job.createdAt);
  const closingLabel = formatDaysLeft(job.expiresAt);
  const deadlineDate = job.expiresAt ? formatDate(job.expiresAt) : null;
  const logoUrl = job.companyLogoKey ? getPublicAssetUrl(job.companyLogoKey) : null;
  const companyName = job.companyName ?? "Company";

  const dashboardJobPath = `/dashboard/jobs/${job.id}`;
  const isClosed = job.status !== "open";
  const hasResume = Boolean(candidateProfile?.resumeKey);

  return (
    <div className="calm min-h-svh bg-background text-foreground">
      <PublicHeader user={user} />

      <main>
        {isClosed ? (
          <div className={cn(PUBLIC_CONTAINER, "pt-4")}>
            <Alert>
              <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
              <AlertDescription>
                This position is no longer accepting applications. You can still view the details
                below.
              </AlertDescription>
              <AlertAction>
                <Button variant="outline" size="sm" asChild>
                  {isCandidate ? (
                    <Link to="/dashboard/applications">Your applications</Link>
                  ) : (
                    <Link to="/jobs">Browse open jobs</Link>
                  )}
                </Button>
              </AlertAction>
            </Alert>
          </div>
        ) : null}

        <section className="border-b border-border/40 bg-background">
          <div className={cn(PUBLIC_CONTAINER, "pb-10 pt-6 lg:pb-12")}>
            <AppBreadcrumbs items={publicJobDetailTrail(job.title)} />

            <div className="mt-8 space-y-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <Avatar className="size-14 shrink-0 rounded-2xl after:rounded-2xl">
                    {logoUrl ? (
                      <AvatarImage src={logoUrl} alt={companyName} className="rounded-2xl" />
                    ) : null}
                    <AvatarFallback className="rounded-2xl bg-muted text-sm font-semibold">
                      {companyInitials(companyName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 space-y-1">
                    <h1 className="text-2xl font-normal tracking-tight sm:text-3xl">{job.title}</h1>
                    <Link
                      to="/companies/$slug"
                      params={{ slug: job.companySlug }}
                      className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {job.companyName}
                    </Link>
                  </div>
                </div>

                {!isCompany && !isClosed ? (
                  <div className="shrink-0 lg:min-w-52">
                    <PublicJobCTA
                      isCandidate={isCandidate}
                      dashboardJobPath={dashboardJobPath}
                      alreadyApplied={alreadyApplied}
                      hasResume={hasResume}
                      job={job}
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <JobStatusBadge job={job} />
                {job.employmentType ? (
                  <Badge variant="secondary" className="gap-1 text-[11px]">
                    <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3" />
                    {employmentTypeLabels[job.employmentType as EmploymentType] ??
                      job.employmentType}
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
                {job.location ? (
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3" />
                    {job.location}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section
          className={cn(PUBLIC_CONTAINER, "grid gap-8 py-8 lg:grid-cols-3 lg:gap-10 lg:py-12")}
        >
          <div className="space-y-8 lg:col-span-2">
            {job.description ? (
              <section className="space-y-3 rounded-2xl bg-muted/30 px-6 py-5">
                <JobDescriptionMarkdown>{job.description}</JobDescriptionMarkdown>
              </section>
            ) : null}

            {!isCompany && !isClosed ? (
              <section className="space-y-4 rounded-3xl border border-border/60 bg-muted-foreground/4.5 px-6 py-5 dark:bg-muted/10">
                <PublicJobCTA
                  isCandidate={isCandidate}
                  dashboardJobPath={dashboardJobPath}
                  alreadyApplied={alreadyApplied}
                  hasResume={hasResume}
                  job={job}
                  variant="bottom"
                />
              </section>
            ) : null}
          </div>

          <aside className="space-y-5">
            <section className="space-y-4 rounded-3xl border border-border/60 bg-muted-foreground/4.5 px-5 py-4 dark:bg-muted/10 md:px-6">
              <h3 className="text-sm font-semibold tracking-tight">Job details</h3>
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
              <DetailRow
                icon={UserGroupIcon}
                label="Applicants"
                value={`${job.applicantCount} ${job.applicantCount === 1 ? "applicant" : "applicants"}`}
              />
              <DetailRow icon={Clock01Icon} label="Posted" value={postedDate} />
              {deadlineDate && closingLabel ? (
                <DetailRow icon={Clock01Icon} label="Apply by" value={closingLabel} />
              ) : null}
            </section>

            <Link
              to="/companies/$slug"
              params={{ slug: job.companySlug }}
              className="group flex items-center gap-3 rounded-3xl border border-border/60 bg-muted-foreground/4.5 px-5 py-4 transition-all hover:border-primary/25 hover:shadow-md hover:shadow-primary/5 dark:bg-muted/10"
            >
              <Avatar className="size-11 shrink-0 rounded-2xl after:rounded-2xl">
                {logoUrl ? (
                  <AvatarImage src={logoUrl} alt={companyName} className="rounded-2xl" />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-muted text-[11px] font-semibold">
                  {companyInitials(companyName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                  {job.companyName}
                </p>
                <p className="text-xs text-muted-foreground">View company profile</p>
              </div>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              />
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
  alreadyApplied,
  hasResume,
  job,
  variant = "header",
}: {
  isCandidate: boolean;
  dashboardJobPath: string;
  alreadyApplied: boolean;
  hasResume: boolean;
  job: { id: string; title: string; companyName: string | null };
  variant?: "header" | "bottom";
}) {
  if (alreadyApplied) {
    return (
      <div className={variant === "bottom" ? "space-y-3" : ""}>
        {variant === "bottom" ? (
          <>
            <p className="text-sm font-semibold">Application submitted</p>
            <p className="text-xs text-muted-foreground">
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

  if (isCandidate && !hasResume) {
    return (
      <div className={variant === "bottom" ? "space-y-3" : ""}>
        {variant === "bottom" ? (
          <>
            <p className="text-sm font-semibold">Interested in this role?</p>
            <p className="text-xs text-muted-foreground">Add a resume to your profile to apply.</p>
          </>
        ) : null}
        <Button size={variant === "header" ? "lg" : "default"} asChild>
          <Link to="/dashboard/settings" search={{ redirect: `/dashboard/jobs/${job.id}` }}>
            {variant === "header" ? "Add resume" : "Add resume to apply"}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-1.5 size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (isCandidate && hasResume) {
    return (
      <div className={variant === "bottom" ? "space-y-3" : ""}>
        {variant === "bottom" ? (
          <>
            <p className="text-sm font-semibold">Apply with one click</p>
            <p className="text-xs text-muted-foreground">
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

  return (
    <div className={variant === "bottom" ? "space-y-3" : ""}>
      {variant === "bottom" ? (
        <>
          <p className="text-sm font-semibold">Interested in this role?</p>
          <p className="text-xs text-muted-foreground">
            Sign in to apply with one click and interview on your schedule.
          </p>
        </>
      ) : null}
      <Button size={variant === "header" ? "lg" : "default"} asChild>
        <Link {...candidateLoginLink(dashboardJobPath)}>
          Log in to apply
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
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5 text-primary/70" />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
