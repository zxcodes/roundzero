import {
  Alert02Icon,
  ArrowRight01Icon,
  Briefcase01Icon,
  Building01Icon,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent } from "@/components/ui/empty";
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
    <div className="bg-background text-foreground min-h-svh">
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

        {/* Header section */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/5%,transparent_60%)]" />
          <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-6 lg:px-10 lg:pb-12">
            <AppBreadcrumbs items={publicJobDetailTrail(job.title)} />

            <div className="mt-8 space-y-5">
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

                {!isCompany && !isClosed ? (
                  <div className="shrink-0">
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

              {/* Meta badges */}
              <div className="flex flex-wrap gap-2">
                <JobStatusBadge job={job} />
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
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-8 lg:grid-cols-3 lg:px-10 lg:py-12">
          {/* Left column — description & requirements */}
          <div className="space-y-10 lg:col-span-2">
            {job.description ? (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Description
                </h2>
                <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {job.description}
                </div>
              </div>
            ) : null}

            {requirements.length > 0 ? (
              <div className="stagger-1 space-y-3">
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
            {!isCompany && !isClosed ? (
              <Empty className="border stagger-2 bg-muted">
                <EmptyContent>
                  <PublicJobCTA
                    isCandidate={isCandidate}
                    dashboardJobPath={dashboardJobPath}
                    alreadyApplied={alreadyApplied}
                    hasResume={hasResume}
                    job={job}
                    variant="bottom"
                  />
                </EmptyContent>
              </Empty>
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
                <DetailRow
                  icon={UserGroupIcon}
                  label="Applicants"
                  value={`${job.applicantCount} ${job.applicantCount === 1 ? "applicant" : "applicants"}`}
                />
                <DetailRow icon={Clock01Icon} label="Posted" value={postedDate} />
                {deadlineDate && closingLabel ? (
                  <DetailRow icon={Clock01Icon} label="Apply by" value={closingLabel} />
                ) : null}
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

  if (isCandidate && !hasResume) {
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

  if (isCandidate && hasResume) {
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
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5 text-primary/70" />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
