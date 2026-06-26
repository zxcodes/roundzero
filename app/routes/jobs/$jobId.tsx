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
import { createFileRoute, Link, notFound, useRouteContext } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { JobDetailSkeleton } from "@/components/route-skeletons";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CandidateApplySection } from "@/features/applications/components/candidate-apply-section";
import { hasApplied } from "@/features/applications/server/functions";
import { candidateLoginLink } from "@/features/auth/signup-search";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { getPublicJobById } from "@/features/jobs/server/functions";
import { publicJobDetailTrail } from "@/shared/breadcrumb-trails";
import { formatDate, formatDaysLeft } from "@/shared/date";
import type { EmploymentType, ExperienceLevel, WorkplaceType } from "@/shared/enums";
import { employmentTypeLabels, experienceLevelLabels, workplaceTypeLabels } from "@/shared/enums";
import { formatSalaryFull } from "@/shared/format";
import { PAGE_SEO } from "@/shared/seo";
import { validateUuidParams } from "@/shared/validation";

type JobDetail = NonNullable<Awaited<ReturnType<typeof getPublicJobById>>>;

const employmentTypeToSchema = (type: string): string => {
  const map: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
  };
  return map[type] ?? "OTHER";
};

function companyInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function jobMeta(job: JobDetail | null) {
  if (!job) return [];

  return [
    {
      name: "description",
      content: PAGE_SEO.apply.description,
    },
    { property: "og:description", content: PAGE_SEO.apply.description },
    { property: "og:url", content: `${import.meta.env.VITE_APP_URL}/jobs/${job.id}` },
    { name: "twitter:description", content: PAGE_SEO.apply.description },
  ];
}

function jobLinks(job: JobDetail | null) {
  if (!job) return [];
  return [{ rel: "canonical" as const, href: `${import.meta.env.VITE_APP_URL}/jobs/${job.id}` }];
}

function jobScripts(job: JobDetail | null) {
  if (!job) return [];

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    hiringOrganization: { "@type": "Organization", name: job.companyName },
    datePosted: job.createdAt,
  };

  if (job.employmentType) {
    schema.employmentType = employmentTypeToSchema(job.employmentType);
  }
  if (job.location) {
    schema.jobLocation = {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.location },
    };
  }
  if (job.salaryMin || job.salaryMax) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salaryCurrency,
      value:
        job.salaryMin && job.salaryMax
          ? { "@type": "QuantitativeValue", minValue: job.salaryMin, maxValue: job.salaryMax }
          : { "@type": "QuantitativeValue", value: job.salaryMin ?? job.salaryMax },
    };
  }
  if (job.expiresAt) {
    schema.validThrough = job.expiresAt;
  }
  if (Array.isArray(job.requirements) && job.requirements.length > 0) {
    schema.skills = job.requirements;
  }
  if (job.workplaceType === "remote") {
    schema.applicantLocationRequirements = "Any";
  }

  return [{ type: "application/ld+json" as const, children: JSON.stringify(schema) }];
}

export const Route = createFileRoute("/jobs/$jobId")({
  beforeLoad: ({ params }) => {
    validateUuidParams({ jobId: params.jobId });
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
    return {
      meta: [
        {
          title: job ? PAGE_SEO.apply.title : "Job Not Found | RoundZero",
        },
        ...jobMeta(job),
      ],
      links: jobLinks(job),
      scripts: jobScripts(job),
    };
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
  const { isCompany } = useRouteContext({ from: "__root__" });

  const salary = formatSalaryFull(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const requirements: string[] = Array.isArray(job.requirements) ? job.requirements : [];
  const postedDate = formatDate(job.createdAt);
  const closingLabel = formatDaysLeft(job.expiresAt);
  const deadlineDate = job.expiresAt ? formatDate(job.expiresAt) : null;

  const dashboardJobPath = `/dashboard/jobs/${job.id}`;
  const isClosed = job.status !== "open";
  const hasResume = Boolean(candidateProfile?.resumeKey);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <PublicHeader />

      <main>
        {isClosed ? (
          <div className="mx-auto max-w-7xl px-6 pt-4 lg:px-10">
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

        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/5%,transparent_60%)]" />
          <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-6 lg:px-10 lg:pb-12">
            <AppBreadcrumbs items={publicJobDetailTrail(job.title)} />

            <div className="mt-8 space-y-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <Avatar className="size-14 shrink-0 rounded-2xl">
                    <AvatarFallback className="rounded-2xl bg-muted text-sm font-semibold">
                      {companyInitials(job.companyName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      {job.title}
                    </h1>
                    <Link
                      to="/companies/$slug"
                      params={{ slug: job.companySlug }}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {job.companyName}
                    </Link>
                    {salary ? (
                      <p className="inline-flex items-center gap-1.5 font-mono text-sm font-medium tabular-nums text-foreground">
                        <HugeiconsIcon
                          icon={MoneyBag02Icon}
                          strokeWidth={2}
                          className="size-3.5 text-muted-foreground"
                        />
                        {salary}
                      </p>
                    ) : null}
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

        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-3 lg:gap-10 lg:px-10 lg:py-12">
          <div className="space-y-8 lg:col-span-2">
            {job.description ? (
              <section className="space-y-3 rounded-2xl bg-muted/30 px-6 py-5">
                <h2 className="text-lg font-semibold tracking-tight">Description</h2>
                <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                  {job.description}
                </div>
              </section>
            ) : null}

            {requirements.length > 0 ? (
              <section className="space-y-3 rounded-2xl bg-muted/30 px-6 py-5">
                <h2 className="text-lg font-semibold tracking-tight">Requirements</h2>
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
              </section>
            ) : null}

            {!isCompany && !isClosed ? (
              <section className="space-y-4 rounded-3xl border border-border/60 bg-muted/20 px-6 py-5">
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
            <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
              <h3 className="text-sm font-semibold tracking-tight">Job details</h3>
              {salary ? (
                <DetailRow icon={MoneyBag02Icon} label="Salary" value={salary} mono />
              ) : null}
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
              className="group flex items-center gap-3 rounded-3xl border border-border/60 px-5 py-4 transition-all hover:border-primary/25 hover:shadow-md hover:shadow-primary/5"
            >
              <Avatar className="size-11 shrink-0 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-muted text-[11px] font-semibold">
                  {companyInitials(job.companyName)}
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
          <Link to="/dashboard/settings">
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
  mono = false,
}: {
  icon: typeof MoneyBag02Icon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5 text-primary/70" />
        {label}
      </span>
      <span className={mono ? "font-mono font-medium tabular-nums" : "font-medium"}>{value}</span>
    </div>
  );
}
