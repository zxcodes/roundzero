import { Briefcase01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Await, createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { DeferredSection } from "@/components/deferred-section";
import { PaginationNav } from "@/components/pagination-nav";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { PUBLIC_CONTAINER, PublicPageHero } from "@/components/public-page";
import { JobsResultsSkeleton } from "@/components/route-skeletons";
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobListRow } from "@/features/jobs/components/job-list-row";
import { getOpenJobsPaginated } from "@/features/jobs/server/functions";
import { useDebouncedSearchInput } from "@/hooks/use-debounced-search-input";
import { cn } from "@/lib/utils";
import type { SalaryCurrency } from "@/shared/enums";
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
import { SALARY_BRACKETS } from "@/shared/format";
import { buildPageHead, PAGE_SEO } from "@/shared/seo";

const searchDefaults = {
  search: "",
  type: "all",
  level: "all",
  workplace: "all",
  salaryMin: 0,
  salaryCurrency: "all",
  company: "all",
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
  company: z.string().default(searchDefaults.company).catch(searchDefaults.company),
  page: z.number().int().min(1).default(searchDefaults.page).catch(searchDefaults.page),
});

export const Route = createFileRoute("/jobs/")({
  validateSearch: jobsSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  loaderDeps: ({ search }) => search,
  head: () =>
    buildPageHead({
      title: PAGE_SEO.jobs.title,
      description: PAGE_SEO.jobs.description,
      path: "/jobs",
    }),
  loader: ({ deps }) => ({
    results: getOpenJobsPaginated({
      data: {
        search: deps.search,
        type: deps.type,
        level: deps.level,
        workplace: deps.workplace,
        salaryMin: deps.salaryMin,
        salaryCurrency: deps.salaryCurrency,
        company: deps.company,
        page: deps.page,
      },
    }),
  }),
  component: JobsPage,
});

type JobsResults = Awaited<ReturnType<typeof getOpenJobsPaginated>>;

function JobsPage() {
  const { results } = Route.useLoaderData();
  const {
    search,
    type: typeFilter,
    level: levelFilter,
    workplace: workplaceFilter,
    salaryMin,
    salaryCurrency,
    company: companyFilter,
    page,
  } = Route.useSearch();
  const navigate = useNavigate({ from: "/jobs/" });

  const hasFilters =
    search ||
    typeFilter !== "all" ||
    levelFilter !== "all" ||
    workplaceFilter !== "all" ||
    salaryCurrency !== "all" ||
    companyFilter !== "all" ||
    salaryMin > 0;
  const brackets =
    SALARY_BRACKETS[(salaryCurrency === "all" ? "USD" : salaryCurrency) as SalaryCurrency] ??
    SALARY_BRACKETS.USD;

  const [searchInput, onSearchInputChange] = useDebouncedSearchInput(search, (next) => {
    void navigate({ search: (prev) => ({ ...prev, search: next, page: 1 }) });
  });

  const onTypeChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, type: value, page: 1 }) });
  };

  const onLevelChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, level: value, page: 1 }) });
  };

  const onWorkplaceChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, workplace: value, page: 1 }) });
  };

  const onCompanyChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, company: value, page: 1 }) });
  };

  const onCurrencyChange = (value: string) => {
    void navigate({
      search: (prev) => ({ ...prev, salaryCurrency: value, salaryMin: 0, page: 1 }),
    });
  };

  const onSalaryChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, salaryMin: Number(value), page: 1 }) });
  };

  const resultsResetKey = `${typeFilter}-${levelFilter}-${workplaceFilter}-${salaryMin}-${salaryCurrency}-${companyFilter}-${page}`;

  return (
    <div className="calm min-h-svh bg-background text-foreground">
      <PublicHeader />

      <main>
        <PublicPageHero
          eyebrow="Job board"
          title="Open positions"
          lead="Browse roles from companies hiring on RoundZero. Apply with one click and interview on your schedule."
        />

        <section className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div
            className={cn(
              "flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center",
              PUBLIC_CONTAINER,
            )}
          >
            <div className="relative flex-1 shrink-0 sm:shrink">
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={2}
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search by title, company, or location..."
                value={searchInput}
                onChange={onSearchInputChange}
                className="pl-10"
              />
            </div>
            <ScrollArea orientation="horizontal" className="-mx-6 h-9 px-6 sm:mx-0 sm:px-0">
              <div className="flex gap-3">
                <Await
                  promise={results}
                  fallback={
                    <Select disabled>
                      <SelectTrigger className="w-44 shrink-0">
                        <SelectValue placeholder="Company" />
                      </SelectTrigger>
                    </Select>
                  }
                >
                  {(data) => {
                    const hasSelectedCompany = data.companies.some(
                      (company) => company.id === companyFilter,
                    );
                    const showStaleCompany = companyFilter !== "all" && !hasSelectedCompany;

                    return (
                      <Select value={companyFilter} onValueChange={onCompanyChange}>
                        <SelectTrigger className="w-44 shrink-0">
                          <SelectValue placeholder="Company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="all">All companies</SelectItem>
                            {showStaleCompany ? (
                              <SelectItem value={companyFilter}>Unknown company</SelectItem>
                            ) : null}
                            {data.companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    );
                  }}
                </Await>
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

        <section className={cn(PUBLIC_CONTAINER, "py-8 pb-14 lg:pb-20")}>
          <DeferredSection
            promise={results}
            resetKey={resultsResetKey}
            fallback={<JobsResultsSkeleton />}
            sectionLabel="job listings"
          >
            {(data) => <JobsResults data={data} page={page} hasFilters={Boolean(hasFilters)} />}
          </DeferredSection>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function JobsResults({
  data,
  page,
  hasFilters,
}: {
  data: JobsResults;
  page: number;
  hasFilters: boolean;
}) {
  return (
    <div className="space-y-5">
      <p className="text-xs font-medium text-muted-foreground">
        {data.total} {data.total === 1 ? "position" : "positions"}
        {hasFilters ? " matching your filters" : ""}
      </p>

      <JobsResultsContent data={data} page={page} hasFilters={hasFilters} />
    </div>
  );
}

function JobsResultsContent({
  data,
  page,
  hasFilters,
}: {
  data: JobsResults;
  page: number;
  hasFilters: boolean;
}) {
  if (data.items.length === 0) {
    return (
      <Empty className="rounded-2xl border-0 bg-muted/30">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>{hasFilters ? "No jobs found" : "No open jobs"}</EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? "Try adjusting your search or filters."
              : "There are no open positions right now. Check back later."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
        {data.items.map((job) => (
          <JobListRow
            key={job.id}
            job={job}
            jobTo="/jobs/$jobId"
            showCompanyName
            linkCompanyToProfile
          />
        ))}
      </div>

      <PaginationNav currentPage={page} totalPages={data.totalPages} />
    </>
  );
}
