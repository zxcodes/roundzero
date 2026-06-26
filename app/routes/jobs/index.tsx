import {
  ArrowRight01Icon,
  Briefcase01Icon,
  Location01Icon,
  MoneyBag02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { PaginationNav } from "@/components/pagination-nav";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { JobsListSkeleton } from "@/components/route-skeletons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getOpenJobsPaginated } from "@/features/jobs/server/functions";
import type {
  EmploymentType,
  ExperienceLevel,
  SalaryCurrency,
  WorkplaceType,
} from "@/shared/enums";
import {
  employmentTypeLabels,
  employmentTypeSchema,
  experienceLevelLabels,
  experienceLevelSchema,
  salaryCurrencyLabels,
  salaryCurrencySchema,
  workplaceTypeLabels,
  workplaceTypeSchema,
} from "@/shared/enums";
import { formatSalary, SALARY_BRACKETS } from "@/shared/format";
import { PAGE_SEO } from "@/shared/seo";

const searchDefaults = {
  search: "",
  type: "all",
  level: "all",
  workplace: "all",
  salaryMin: 0,
  salaryCurrency: "all",
  page: 1,
} as const;

const jobsSearchSchema = z.object({
  search: z.string().default(searchDefaults.search).catch(searchDefaults.search),
  type: z.string().default(searchDefaults.type).catch(searchDefaults.type),
  level: z.string().default(searchDefaults.level).catch(searchDefaults.level),
  workplace: z.string().default(searchDefaults.workplace).catch(searchDefaults.workplace),
  salaryMin: z
    .number()
    .int()
    .min(0)
    .default(searchDefaults.salaryMin)
    .catch(searchDefaults.salaryMin),
  salaryCurrency: z
    .string()
    .default(searchDefaults.salaryCurrency)
    .catch(searchDefaults.salaryCurrency),
  page: z.number().int().min(1).default(searchDefaults.page).catch(searchDefaults.page),
});

export const Route = createFileRoute("/jobs/")({
  validateSearch: jobsSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  loaderDeps: ({ search }) => search,
  head: () => ({
    meta: [
      { title: PAGE_SEO.jobs.title },
      {
        name: "description",
        content: PAGE_SEO.jobs.description,
      },
      {
        property: "og:url",
        content: `${import.meta.env.VITE_APP_URL}/jobs`,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: `${import.meta.env.VITE_APP_URL}/jobs`,
      },
    ],
  }),
  loader: async ({ deps }) => {
    const result = await getOpenJobsPaginated({
      data: {
        search: deps.search,
        type: deps.type,
        level: deps.level,
        workplace: deps.workplace,
        salaryMin: deps.salaryMin,
        salaryCurrency: deps.salaryCurrency,
        page: deps.page,
      },
    });
    return result;
  },
  pendingComponent: JobsListSkeleton,
  component: JobsPage,
});

function companyInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function JobsPage() {
  const { items, total, totalPages } = Route.useLoaderData();
  const {
    search,
    type: typeFilter,
    level: levelFilter,
    workplace: workplaceFilter,
    salaryMin,
    salaryCurrency,
    page,
  } = Route.useSearch();
  const navigate = useNavigate({ from: "/jobs/" });

  const hasFilters =
    search ||
    typeFilter !== "all" ||
    levelFilter !== "all" ||
    workplaceFilter !== "all" ||
    salaryCurrency !== "all" ||
    salaryMin > 0;
  const brackets =
    SALARY_BRACKETS[(salaryCurrency === "all" ? "USD" : salaryCurrency) as SalaryCurrency] ??
    SALARY_BRACKETS.USD;

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void navigate({ search: (prev) => ({ ...prev, search: e.target.value, page: 1 }) });
  };

  const onTypeChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, type: value, page: 1 }) });
  };

  const onLevelChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, level: value, page: 1 }) });
  };

  const onWorkplaceChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, workplace: value, page: 1 }) });
  };

  const onCurrencyChange = (value: string) => {
    void navigate({
      search: (prev) => ({ ...prev, salaryCurrency: value, salaryMin: 0, page: 1 }),
    });
  };

  const onSalaryChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, salaryMin: Number(value), page: 1 }) });
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/6%,transparent_70%)]" />
          <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                Job board
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Open positions</h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                Browse roles from companies hiring on RoundZero. Apply with one click and interview
                on your schedule.
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">{total}</span> open{" "}
                {total === 1 ? "position" : "positions"}
                {hasFilters ? " matching your filters" : ""}
              </p>
            </div>
          </div>
        </section>

        <section className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3.5 sm:flex-row sm:items-center lg:px-10">
            <div className="relative flex-1 shrink-0 sm:shrink">
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={2}
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search by title, company, or location..."
                value={search}
                onChange={onSearchInputChange}
                className="pl-10"
              />
            </div>
            <ScrollArea orientation="horizontal" className="-mx-6 h-9 px-6 sm:mx-0 sm:px-0">
              <div className="flex gap-3">
                <Select value={typeFilter} onValueChange={onTypeChange}>
                  <SelectTrigger className="w-36 shrink-0">
                    <SelectValue placeholder="Job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {employmentTypeSchema.options.map((value) => (
                      <SelectItem key={value} value={value}>
                        {employmentTypeLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={levelFilter} onValueChange={onLevelChange}>
                  <SelectTrigger className="w-36 shrink-0">
                    <SelectValue placeholder="Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    {experienceLevelSchema.options.map((value) => (
                      <SelectItem key={value} value={value}>
                        {experienceLevelLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={workplaceFilter} onValueChange={onWorkplaceChange}>
                  <SelectTrigger className="w-36 shrink-0">
                    <SelectValue placeholder="Workplace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All workplaces</SelectItem>
                    {workplaceTypeSchema.options.map((value) => (
                      <SelectItem key={value} value={value}>
                        {workplaceTypeLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={salaryCurrency} onValueChange={onCurrencyChange}>
                  <SelectTrigger className="w-36 shrink-0">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All currencies</SelectItem>
                    {salaryCurrencySchema.options.map((value) => (
                      <SelectItem key={value} value={value}>
                        {salaryCurrencyLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(salaryMin)} onValueChange={onSalaryChange}>
                  <SelectTrigger className="w-36 shrink-0">
                    <SelectValue placeholder="Salary" />
                  </SelectTrigger>
                  <SelectContent>
                    {brackets.map((bracket) => (
                      <SelectItem key={bracket.value} value={bracket.value}>
                        {bracket.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ScrollArea>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-8 pb-14 lg:px-10 lg:pb-20">
          {items.length === 0 ? (
            <Empty className="rounded-2xl border-0 bg-muted/30">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>No jobs found</EmptyTitle>
                <EmptyDescription>Try adjusting your search or filters.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {items.map((job, i) => (
                <JobCard key={job.id} job={job} className={i < 4 ? `stagger-${i + 1}` : ""} />
              ))}
            </div>
          )}

          <PaginationNav currentPage={page} totalPages={totalPages} className="mt-10" />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

type JobFromLoader = Awaited<ReturnType<typeof getOpenJobsPaginated>>["items"][number];

function JobCard({ job, className }: { job: JobFromLoader; className?: string }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const navigate = useNavigate();

  const onCompanyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigate({ to: "/companies/$slug", params: { slug: job.companySlug } });
  };
  const onCompanyKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      onCompanyClick(e as unknown as React.MouseEvent);
    }
  };

  return (
    <Link to="/jobs/$jobId" params={{ jobId: job.id }} className={className}>
      <Card
        variant="bordered-inset"
        className="group h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5"
      >
        <CardContent className="flex h-full min-h-52 flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <Avatar className="size-11 shrink-0 rounded-2xl">
              <AvatarFallback className="rounded-2xl bg-muted text-[11px] font-semibold">
                {companyInitials(job.companyName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="line-clamp-2 text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                {job.title}
              </p>
              {/* biome-ignore lint/a11y/useSemanticElements: can't nest <a> inside parent <Link> */}
              <span
                role="link"
                tabIndex={0}
                onClick={onCompanyClick}
                onKeyDown={onCompanyKeyDown}
                className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {job.companyName}
              </span>
            </div>

            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {job.location ? (
              <span className="inline-flex items-center gap-1">
                <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3.5" />
                {job.location}
              </span>
            ) : null}
            {job.workplaceType ? (
              <Badge variant="outline" className="text-[11px]">
                {workplaceTypeLabels[job.workplaceType as WorkplaceType] ?? job.workplaceType}
              </Badge>
            ) : null}
          </div>

          {salary ? (
            <p className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-foreground">
              <HugeiconsIcon
                icon={MoneyBag02Icon}
                strokeWidth={2}
                className="size-3.5 text-muted-foreground"
              />
              {salary}
            </p>
          ) : null}

          {job.description ? (
            <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
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
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
