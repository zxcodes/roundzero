import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Briefcase01Icon,
  Building01Icon,
  Link04Icon,
  Location01Icon,
  MoneyBag02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { CompanyDetailSkeleton } from "@/components/route-skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { getCompanyBySlug } from "@/features/companies/server/functions";
import { getOpenJobsByCompanyId } from "@/features/jobs/server/functions";
import type {
  CompanySize,
  EmploymentType,
  ExperienceLevel,
  Industry,
  WorkplaceType,
} from "@/shared/enums";
import {
  companySizeLabels,
  employmentTypeLabels,
  experienceLevelLabels,
  industryLabels,
  workplaceTypeLabels,
} from "@/shared/enums";
import { formatSalary } from "@/shared/format";
import { getPublicAssetUrl } from "@/shared/r2";

export const Route = createFileRoute("/companies/$slug")({
  loader: async ({ params }) => {
    const company = await getCompanyBySlug({ data: { slug: params.slug } });
    const jobs = await getOpenJobsByCompanyId({ data: { companyId: company.id } });
    return { company, jobs };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.company
          ? `${loaderData.company.name} | RoundZero`
          : "Company Not Found | RoundZero",
      },
    ],
  }),
  pendingComponent: CompanyDetailSkeleton,
  component: CompanyProfilePage,
});

function CompanyProfilePage() {
  const { company, jobs } = Route.useLoaderData();

  const initials = company.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const techStack: string[] = Array.isArray(company.techStack) ? company.techStack : [];
  const logoUrl = company.logoKey ? getPublicAssetUrl(company.logoKey) : null;
  const socialLinks: Record<string, string> =
    company.socialLinks &&
    typeof company.socialLinks === "object" &&
    !Array.isArray(company.socialLinks)
      ? (company.socialLinks as Record<string, string>)
      : {};

  return (
    <div className="bg-background text-foreground min-h-svh">
      <PublicHeader />

      <main>
        {/* Back link + hero */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/5%,transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-6 lg:px-8 lg:pb-12">
            <Link
              to="/companies"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
              All companies
            </Link>

            <div className="animate-fade-in mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar className="size-16 rounded-xl">
                {logoUrl ? <AvatarImage src={logoUrl} alt={company.name} /> : null}
                <AvatarFallback className="rounded-xl text-lg font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {company.name}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    {company.industry ? (
                      <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon icon={Building01Icon} strokeWidth={2} className="size-3.5" />
                        {industryLabels[company.industry as Industry] ?? company.industry}
                      </span>
                    ) : null}
                    {company.location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3.5" />
                        {company.location}
                      </span>
                    ) : null}
                    {company.companySize ? (
                      <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
                        {companySizeLabels[company.companySize as CompanySize] ??
                          company.companySize}
                      </span>
                    ) : null}
                    {company.foundedYear ? <span>Founded {company.foundedYear}</span> : null}
                  </div>
                </div>
                {/* Action row */}
                <div className="flex flex-wrap items-center gap-2">
                  {company.website ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={company.website} target="_blank" rel="noopener noreferrer">
                        <HugeiconsIcon
                          icon={Link04Icon}
                          strokeWidth={2}
                          className="mr-1.5 size-3.5"
                        />
                        Website
                      </a>
                    </Button>
                  ) : null}
                  {Object.entries(socialLinks).map(([label, url]) => (
                    <Button key={label} variant="ghost" size="sm" asChild>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground"
                      >
                        {label}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-8 lg:grid-cols-3 lg:px-8 lg:py-12">
          {/* Left column — about + jobs */}
          <div className="space-y-10 lg:col-span-2">
            {company.description ? (
              <div className="animate-fade-in space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  About
                </h2>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {company.description}
                </p>
              </div>
            ) : null}

            {company.culture ? (
              <div className="animate-fade-in stagger-1 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Culture & Perks
                </h2>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {company.culture}
                </p>
              </div>
            ) : null}

            {/* Open jobs */}
            <div className="animate-fade-in stagger-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Open positions
                  </h2>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {jobs.length}
                  </span>
                </div>
              </div>

              {jobs.length === 0 ? (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={1.5} />
                    </EmptyMedia>
                    <EmptyTitle>No open positions</EmptyTitle>
                    <EmptyDescription>Check back later for new opportunities.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-3 flex flex-col">
                  {jobs.map((job) => (
                    <CompanyJobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-6">
            {techStack.length > 0 ? (
              <Card>
                <CardContent className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Tech stack
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {techStack.map((tech) => (
                      <Badge key={tech} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Quick stats */}
            <Card>
              <CardContent className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  At a glance
                </h3>
                <div className="space-y-2.5">
                  {company.industry ? (
                    <StatRow
                      label="Industry"
                      value={industryLabels[company.industry as Industry] ?? company.industry}
                    />
                  ) : null}
                  {company.companySize ? (
                    <StatRow
                      label="Size"
                      value={
                        companySizeLabels[company.companySize as CompanySize] ?? company.companySize
                      }
                    />
                  ) : null}
                  {company.foundedYear ? (
                    <StatRow label="Founded" value={String(company.foundedYear)} />
                  ) : null}
                  {company.location ? <StatRow label="Location" value={company.location} /> : null}
                  <StatRow label="Open roles" value={String(jobs.length)} />
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

type JobFromLoader = Awaited<ReturnType<typeof getOpenJobsByCompanyId>>[number];

function CompanyJobCard({ job }: { job: JobFromLoader }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <Link to="/jobs/$jobId" params={{ jobId: job.id }}>
      <Card className="group transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
        <CardContent className="flex items-center gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-semibold transition-colors group-hover:text-primary">
              {job.title}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {job.location ? (
                <span className="inline-flex items-center gap-1">
                  <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3" />
                  {job.location}
                </span>
              ) : null}
              {job.employmentType ? (
                <span>
                  {employmentTypeLabels[job.employmentType as EmploymentType] ?? job.employmentType}
                </span>
              ) : null}
              {job.experienceLevel ? (
                <span>
                  {experienceLevelLabels[job.experienceLevel as ExperienceLevel] ??
                    job.experienceLevel}
                </span>
              ) : null}
              {salary ? (
                <span className="inline-flex items-center gap-1">
                  <HugeiconsIcon icon={MoneyBag02Icon} strokeWidth={2} className="size-3" />
                  {salary}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {job.workplaceType ? (
              <Badge variant="outline" className="text-[11px]">
                {workplaceTypeLabels[job.workplaceType as WorkplaceType] ?? job.workplaceType}
              </Badge>
            ) : null}
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
