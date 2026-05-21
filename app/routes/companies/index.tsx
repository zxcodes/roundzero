import {
  Briefcase01Icon,
  Building01Icon,
  Location01Icon,
  Search01Icon,
  UserGroupIcon,
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
import type { CompanySize, Industry } from "@/shared/enums";
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
        content: "https://roundzero.dev/companies",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://roundzero.dev/companies",
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
          <div className="relative mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="animate-fade-in space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Company directory
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Companies hiring on RoundZero
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
                Explore teams building great products. Find the right culture, stack, and role for
                you.
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="sticky top-14 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3.5 sm:flex-row sm:items-center lg:px-8">
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

        {/* Results count */}
        <div className="mx-auto max-w-6xl px-6 pt-6 lg:px-8">
          <p className="text-xs font-medium text-muted-foreground">
            {total} {total === 1 ? "company" : "companies"}
            {hasFilters ? " matching your filters" : ""}
          </p>
        </div>

        {/* Grid */}
        <section className="mx-auto max-w-6xl px-6 py-4 pb-12 lg:px-8 lg:pb-16">
          {items.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={Building01Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>No companies found</EmptyTitle>
                <EmptyDescription>Try adjusting your search or filters.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="animate-fade-in grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <PaginationNav currentPage={page} totalPages={totalPages} className="mt-8" />
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
      <Card className="group h-full ring-foreground/5 transition-all duration-200 hover:ring-primary/30 hover:shadow-md hover:shadow-primary/5">
        <CardContent className="space-y-4">
          {/* Header row */}
          <div className="flex items-start gap-3.5">
            <Avatar className="size-11 rounded-xl">
              {logoUrl ? <AvatarImage src={logoUrl} alt={company.name} /> : null}
              <AvatarFallback className="rounded-xl text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                {company.name}
              </p>
              {company.industry ? (
                <p className="text-xs text-muted-foreground">
                  {industryLabels[company.industry as Industry] ?? company.industry}
                </p>
              ) : null}
            </div>
            {company.openJobCount > 0 ? (
              <Badge variant="secondary" className="shrink-0 gap-1 text-[11px] font-semibold">
                <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3" />
                {company.openJobCount}
              </Badge>
            ) : null}
          </div>

          {/* Description */}
          {company.description ? (
            <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {company.description}
            </p>
          ) : null}

          {/* Tech stack tags */}
          {techStack.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {techStack.slice(0, 4).map((tech) => (
                <span
                  key={tech}
                  className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
              {techStack.length > 4 ? (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  +{techStack.length - 4}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            {company.location ? (
              <span className="inline-flex items-center gap-1">
                <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3.5" />
                {company.location}
              </span>
            ) : null}
            {company.companySize ? (
              <span className="inline-flex items-center gap-1">
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
                {companySizeLabels[company.companySize as CompanySize] ?? company.companySize}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
