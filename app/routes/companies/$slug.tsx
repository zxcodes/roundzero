import {
  Briefcase01Icon,
  Building01Icon,
  Link04Icon,
  Location01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { PUBLIC_CONTAINER } from "@/components/public-page";
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
import { JobListRow } from "@/features/jobs/components/job-list-row";
import { getOpenJobsByCompanyId } from "@/features/jobs/server/functions";
import { cn } from "@/lib/utils";
import { publicCompanyDetailTrail } from "@/shared/breadcrumb-trails";
import type { CompanySize, Industry } from "@/shared/enums";
import { companySizeLabels, industryLabels } from "@/shared/enums";
import { getPublicAssetUrl } from "@/shared/r2";
import { buildPageHead, organizationJsonLd } from "@/shared/seo";

type CompanyDetail = NonNullable<Awaited<ReturnType<typeof getCompanyBySlug>>>;
type LoaderData = { company: CompanyDetail; jobs: Array<unknown> };

function companySeo(data: LoaderData) {
  const industry = data.company.industry ? ` — ${data.company.industry}` : "";
  const location = data.company.location ? `, ${data.company.location}` : "";
  const jobCount = data.jobs.length;
  const plural = jobCount === 1 ? "position" : "positions";

  return {
    title: `${data.company.name} | RoundZero`,
    description: `${data.company.name}${industry}${location}. ${jobCount} open ${plural} hiring on RoundZero.`,
    ogDescription: `${data.company.name} is hiring on RoundZero. ${jobCount} open ${plural} available.`,
  };
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
    if (!data) {
      return buildPageHead({
        title: "Company Not Found | RoundZero",
        description: "This company profile could not be found on RoundZero.",
        path: "/companies",
      });
    }

    const seo = companySeo(data);
    const logoUrl = data.company.logoKey ? getPublicAssetUrl(data.company.logoKey) : null;

    return buildPageHead({
      title: seo.title,
      description: seo.description,
      path: `/companies/${data.company.slug}`,
      ogDescription: seo.ogDescription,
      scripts: [
        organizationJsonLd({
          name: data.company.name,
          slug: data.company.slug,
          description: data.company.description,
          website: data.company.website,
          industry: data.company.industry,
          foundedYear: data.company.foundedYear,
          logoUrl,
        }),
      ],
    });
  },
  pendingComponent: CompanyDetailSkeleton,
  component: CompanyProfilePage,
});

function CompanyProfilePage() {
  const { company, jobs } = Route.useLoaderData();

  const initials = company.name
    .split(" ")
    .map((word) => word[0])
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
    <div className="calm min-h-svh bg-background text-foreground">
      <PublicHeader />

      <main>
        {/* Back link + hero */}
        <section className="border-b border-border/40 bg-background">
          <div className={cn(PUBLIC_CONTAINER, "pb-10 pt-6 lg:pb-12")}>
            <AppBreadcrumbs items={publicCompanyDetailTrail(company.name)} />

            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
              <Avatar className="size-16 shrink-0 rounded-2xl after:rounded-2xl">
                {logoUrl ? (
                  <AvatarImage src={logoUrl} alt={company.name} className="rounded-2xl" />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-muted text-lg font-semibold">
                  {initials}
                </AvatarFallback>
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
        <section className={cn(PUBLIC_CONTAINER, "grid gap-10 py-8 lg:grid-cols-3 lg:py-12")}>
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
                <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
                  {jobs.map((job) => (
                    <JobListRow key={job.id} job={job} jobTo="/jobs/$jobId" />
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
