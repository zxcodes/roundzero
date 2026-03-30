import {
  Briefcase01Icon,
  Location01Icon,
  MoneyBag02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getOpenJobs } from "@/features/jobs/server/functions";
import type { EmploymentType, ExperienceLevel, WorkplaceType } from "@/shared/enums";
import {
  employmentTypeLabels,
  employmentTypeSchema,
  experienceLevelLabels,
  experienceLevelSchema,
  workplaceTypeLabels,
} from "@/shared/enums";

export const Route = createFileRoute("/jobs/")({
  loader: async () => {
    const jobs = await getOpenJobs();
    return { jobs };
  },
  component: JobsPage,
});

function JobsPage() {
  const { jobs } = Route.useLoaderData();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  const filtered = jobs.filter((j) => {
    const matchesSearch =
      !search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.companyName.toLowerCase().includes(search.toLowerCase()) ||
      j.location?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || j.employmentType === typeFilter;
    const matchesLevel = levelFilter === "all" || j.experienceLevel === levelFilter;
    return matchesSearch && matchesType && matchesLevel;
  });

  const hasFilters = search || typeFilter !== "all" || levelFilter !== "all";

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
                Job board
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Open positions</h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
                Browse roles from companies hiring on Hirely. Apply with one click and interview on
                your schedule.
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
                placeholder="Search by title, company, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
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
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full sm:w-40">
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
          </div>
        </section>

        {/* Results count */}
        <div className="mx-auto max-w-6xl px-6 pt-6 lg:px-8">
          <p className="text-xs font-medium text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "position" : "positions"}
            {hasFilters ? " matching your filters" : ""}
          </p>
        </div>

        {/* Grid */}
        <section className="mx-auto max-w-6xl px-6 py-4 pb-12 lg:px-8 lg:pb-16">
          {filtered.length === 0 ? (
            <div className="animate-fade-in py-24 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                <HugeiconsIcon
                  icon={Briefcase01Icon}
                  strokeWidth={1.5}
                  className="size-6 text-muted-foreground/60"
                />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">No jobs found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="animate-fade-in grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((job, i) => (
                <JobCard key={job.id} job={job} className={i < 3 ? `stagger-${i + 1}` : ""} />
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

type JobFromLoader = Awaited<ReturnType<typeof getOpenJobs>>[number];

function JobCard({ job, className }: { job: JobFromLoader; className?: string }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const navigate = useNavigate();

  const onCompanyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate({ to: "/companies/$slug", params: { slug: job.companySlug } });
  };

  return (
    <Link to="/jobs/$jobId" params={{ jobId: job.id }} className={className}>
      <Card className="group h-full transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
        <CardContent className="flex h-full flex-col space-y-3">
          {/* Title + company */}
          <div>
            <p className="text-sm font-semibold transition-colors group-hover:text-primary">
              {job.title}
            </p>
            <span
              role="link"
              tabIndex={0}
              onClick={onCompanyClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  onCompanyClick(e as unknown as React.MouseEvent);
              }}
              className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              {job.companyName}
            </span>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {job.location ? (
              <span className="inline-flex items-center gap-1">
                <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3.5" />
                {job.location}
              </span>
            ) : null}
            {salary ? (
              <span className="inline-flex items-center gap-1">
                <HugeiconsIcon icon={MoneyBag02Icon} strokeWidth={2} className="size-3.5" />
                {salary}
              </span>
            ) : null}
          </div>

          {/* Description */}
          {job.description ? (
            <p className="line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          ) : null}

          {/* Tags */}
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
            {job.workplaceType ? (
              <Badge variant="outline" className="text-[11px]">
                {workplaceTypeLabels[job.workplaceType as WorkplaceType] ?? job.workplaceType}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const formatSalary = (min: number | null, max: number | null, currency: string): string | null => {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  };
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "\u20AC" : `${currency} `;
  if (min && max) return `${sym}${fmt(min)}\u2013${sym}${fmt(max)}`;
  if (min) return `From ${sym}${fmt(min)}`;
  return `Up to ${sym}${fmt(max!)}`;
};
