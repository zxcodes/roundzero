import {
  ArrowRight01Icon,
  Briefcase01Icon,
  Building01Icon,
  Location01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { PaginationNav } from "@/components/pagination-nav";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { CompaniesListSkeleton } from "@/components/route-skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllCompaniesPaginated } from "@/features/companies/server/functions";
import type { Industry } from "@/shared/enums";
import {
  companySizeLabels,
  companySizeSchema,
  industryLabels,
  industrySchema,
} from "@/shared/enums";
import { getPublicAssetUrl } from "@/shared/r2";

const searchDefaults = { search: "", industry: "all", size: "all", page: 1 } as const;

const companiesSearchSchema = z.object({
  search: z.string().default(searchDefaults.search).catch(searchDefaults.search),
  industry: z.string().default(searchDefaults.industry).catch(searchDefaults.industry),
  size: z.string().default(searchDefaults.size).catch(searchDefaults.size),
  page: z.number().int().min(1).default(searchDefaults.page).catch(searchDefaults.page),
});

export const Route = createFileRoute("/companies/")({
  validateSearch: companiesSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  loaderDeps: ({ search }) => search,
  head: () => ({
    meta: [
      { title: "Browse Companies | RoundZero" },
      {
        name: "description",
        content:
          "Explore companies hiring on RoundZero. Find the right culture, stack, and role for you. Browse team profiles, open positions, and more.",
      },
      {
        property: "og:url",
        content: `${import.meta.env.VITE_APP_URL}/companies`,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: `${import.meta.env.VITE_APP_URL}/companies`,
      },
    ],
  }),
  loader: async ({ deps }) => {
    const result = await getAllCompaniesPaginated({
      data: {
        search: deps.search,
        industry: deps.industry,
        size: deps.size,
        page: deps.page,
      },
    });
    return result;
  },
  pendingComponent: CompaniesListSkeleton,
  component: CompaniesPage,
});

function CompaniesPage() {
  const { items, total, totalPages } = Route.useLoaderData();
  const { search, industry: industryFilter, size: sizeFilter, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/companies/" });

  const hasFilters = search || industryFilter !== "all" || sizeFilter !== "all";

  const onSearchChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, search: value, page: 1 }) });
  };
  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const onIndustryChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, industry: value, page: 1 }) });
  };

  const onSizeChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, size: value, page: 1 }) });
  };

  return (
    <div className="bg-background text-foreground min-h-svh">
      <PublicHeader />

      <main>
        {/* Header */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/6%,transparent_70%)]" />
          <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                Company directory
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Companies hiring on RoundZero
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                Explore teams building great products. Find the right culture, stack, and role for
                you.
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-mono font-medium tabular-nums text-foreground">{total}</span>{" "}
                {total === 1 ? "company" : "companies"}
                {hasFilters ? " matching your filters" : ""}
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3.5 sm:flex-row sm:items-center lg:px-10">
            <div className="relative flex-1">
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={2}
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search companies..."
                value={search}
                onChange={onSearchInputChange}
                className="pl-10"
              />
            </div>
            <Select value={industryFilter} onValueChange={onIndustryChange}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All industries</SelectItem>
                {industrySchema.options.map((value) => (
                  <SelectItem key={value} value={value}>
                    {industryLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sizeFilter} onValueChange={onSizeChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Company size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sizes</SelectItem>
                {companySizeSchema.options.map((value) => (
                  <SelectItem key={value} value={value}>
                    {companySizeLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-8 pb-14 lg:px-10 lg:pb-20">
          {items.length === 0 ? (
            <Empty className="rounded-2xl border-0 bg-muted/30">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={Building01Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>No companies found</EmptyTitle>
                <EmptyDescription>Try adjusting your search or filters.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {items.map((company, i) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  className={i < 3 ? `stagger-${i + 1}` : ""}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <PaginationNav currentPage={page} totalPages={totalPages} className="mt-10" />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

type CompanyFromLoader = Awaited<ReturnType<typeof getAllCompaniesPaginated>>["items"][number];

function CompanyCard({ company, className }: { company: CompanyFromLoader; className?: string }) {
  const initials = company.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const techStack: string[] = Array.isArray(company.techStack) ? company.techStack : [];
  const logoUrl = company.logoKey ? getPublicAssetUrl(company.logoKey) : null;

  return (
    <Link to="/companies/$slug" params={{ slug: company.slug }} className={className}>
      <Card className="group h-full gap-0 rounded-3xl border border-border/60 py-0 shadow-none ring-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="flex h-full min-h-48 flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <Avatar className="size-11 shrink-0 rounded-2xl">
              {logoUrl ? <AvatarImage src={logoUrl} alt={company.name} /> : null}
              <AvatarFallback className="rounded-2xl bg-muted text-[11px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="line-clamp-2 text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                {company.name}
              </p>
              {company.industry ? (
                <p className="text-sm text-muted-foreground">
                  {industryLabels[company.industry as Industry] ?? company.industry}
                </p>
              ) : null}
            </div>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </div>

          {company.description ? (
            <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              {company.description}
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
            {company.openJobCount > 0 ? (
              <Badge variant="secondary" className="gap-1 text-[11px]">
                <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3" />
                {company.openJobCount} open {company.openJobCount === 1 ? "role" : "roles"}
              </Badge>
            ) : null}
            {company.location ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3.5" />
                {company.location}
              </span>
            ) : null}
            {techStack.length > 0 ? (
              <Badge variant="outline" className="text-[11px]">
                {techStack.slice(0, 2).join(" · ")}
                {techStack.length > 2 ? ` +${techStack.length - 2}` : ""}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
