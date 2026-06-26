import {
  ArrowRight01Icon,
  Briefcase01Icon,
  Building01Icon,
  Link04Icon,
  Location01Icon,
  MoneyBag02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { CompanyDetailSkeleton } from "@/components/route-skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { getCompanyBySlug } from "@/features/companies/server/functions";
import { getOpenJobsByCompanyId } from "@/features/jobs/server/functions";
import { publicCompanyDetailTrail } from "@/shared/breadcrumb-trails";
import type { CompanySize, Industry, WorkplaceType } from "@/shared/enums";
import { companySizeLabels, industryLabels, workplaceTypeLabels } from "@/shared/enums";
import { formatSalary } from "@/shared/format";
import { getPublicAssetUrl } from "@/shared/r2";

type CompanyDetail = NonNullable<Awaited<ReturnType<typeof getCompanyBySlug>>>;
type LoaderData = { company: CompanyDetail; jobs: Array<unknown> };

function companyMeta(data: LoaderData | null) {
  if (!data) return [];

  const industry = data.company.industry ? ` — ${data.company.industry}` : "";
  const location = data.company.location ? `, ${data.company.location}` : "";
  const jobCount = data.jobs.length;
  const plural = jobCount === 1 ? "position" : "positions";

  return [
    {
      name: "description",
      content: `${data.company.name}${industry}${location}. ${jobCount} open ${plural} hiring on RoundZero.`,
    },
    {
      property: "og:description",
      content: `${data.company.name} is hiring on RoundZero. ${jobCount} open ${plural} available.`,
    },
    {
      property: "og:url",
      content: `${import.meta.env.VITE_APP_URL}/companies/${data.company.slug}`,
    },
  ];
}

function companyLinks(data: LoaderData | null) {
  if (!data) return [];
  return [
    {
      rel: "canonical" as const,
      href: `${import.meta.env.VITE_APP_URL}/companies/${data.company.slug}`,
    },
  ];
}

function companyScripts(data: LoaderData | null) {
  if (!data) return [];

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: data.company.name,
  };

  if (data.company.description) schema.description = data.company.description;
  if (data.company.website) schema.url = data.company.website;
  if (data.company.industry) schema.industry = data.company.industry;
  if (data.company.foundedYear) schema.foundingDate = String(data.company.foundedYear);

  return [{ type: "application/ld+json" as const, children: JSON.stringify(schema) }];
}

export const Route = createFileRoute("/companies/$slug")({
  loader: async ({ params }) => {
    const company = await getCompanyBySlug({ data: { slug: params.slug } });
    if (!company) {
      throw notFound();
    }
    const jobs = await getOpenJobsByCompanyId({ data: { companyId: company.id } });
    return { company, jobs };
  },
  head: ({ loaderData }) => {
    const data = loaderData ?? null;
    return {
      meta: [
        { title: data ? `${data.company.name} | RoundZero` : "Company Not Found | RoundZero" },
        ...companyMeta(data),
      ],
      links: companyLinks(data),
      scripts: companyScripts(data),
    };
  },
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
          <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-6 lg:px-10 lg:pb-12">
            <AppBreadcrumbs items={publicCompanyDetailTrail(company.name)} />

            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar className="size-16 rounded-xl">
                {logoUrl ? <AvatarImage src={logoUrl} alt={company.name} /> : null}
                <AvatarFallback className="rounded-xl text-lg font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
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
                  {Object.entries(socialLinks).map(([key, url]) => (
                    <Button key={key} variant="ghost" size="sm" asChild>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground"
                      >
                        {socialLinkLabel(key)}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-8 lg:grid-cols-3 lg:px-10 lg:py-12">
          {/* Left column — about + jobs */}
          <div className="space-y-6 lg:col-span-2">
            {company.description ? (
              <section className="rounded-2xl bg-muted/30 px-6 py-5">
                <h2 className="text-lg font-semibold tracking-tight">About</h2>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">
                  {company.description}
                </p>
              </section>
            ) : null}

            {company.culture ? (
              <section className="stagger-1 rounded-2xl bg-muted/30 px-6 py-5">
                <h2 className="text-lg font-semibold tracking-tight">Culture & perks</h2>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">
                  {company.culture}
                </p>
              </section>
            ) : null}

            {/* Open jobs */}
            <div className="stagger-2 space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Open positions</h2>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {jobs.length}
                </span>
              </div>

              {jobs.length === 0 ? (
                <Empty className="rounded-2xl border-0 bg-muted/30">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />
                    </EmptyMedia>
                    <EmptyTitle>No open positions</EmptyTitle>
                    <EmptyDescription>Check back later for new opportunities.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-3">
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
              <section className="rounded-3xl border border-border/60 bg-muted-foreground/4.5 px-5 py-4 dark:bg-muted/10 md:px-6">
                <h3 className="text-base font-semibold tracking-tight">Tech stack</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {techStack.map((tech) => (
                    <Badge key={tech} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-3xl border border-border/60 bg-muted-foreground/4.5 px-5 py-4 dark:bg-muted/10 md:px-6">
              <h3 className="text-base font-semibold tracking-tight">At a glance</h3>
              <div className="mt-3 space-y-3">
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
              </div>
            </section>
          </aside>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

const SOCIAL_LINK_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
  github: "GitHub",
};

function socialLinkLabel(key: string) {
  return SOCIAL_LINK_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
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
    <Link
      to="/jobs/$jobId"
      params={{ jobId: job.id }}
      className="group flex items-center gap-3 rounded-3xl border border-border/60 bg-muted-foreground/4.5 px-4 py-3.5 transition-colors hover:border-primary/25 hover:bg-muted/30 dark:bg-muted/10 md:px-5"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold group-hover:text-primary">{job.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {job.location ? (
            <span className="inline-flex items-center gap-1">
              <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3" />
              {job.location}
            </span>
          ) : null}
          {salary ? (
            <span className="inline-flex items-center gap-1 font-medium tabular-nums text-foreground">
              <HugeiconsIcon icon={MoneyBag02Icon} strokeWidth={2} className="size-3" />
              {salary}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {job.workplaceType ? (
          <Badge variant="outline" className="text-[11px]">
            {workplaceTypeLabels[job.workplaceType as WorkplaceType] ?? job.workplaceType}
          </Badge>
        ) : null}
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2}
          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>
    </Link>
  );
}
