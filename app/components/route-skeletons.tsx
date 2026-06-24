import { getRouteApi, useRouteContext } from "@tanstack/react-router";
import { BreadcrumbSkeleton } from "@/components/app-breadcrumbs";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for /jobs — public jobs listing page.
 * Matches: hero header + filter bar + results count + 3-column card grid + pagination.
 */
export function JobsListSkeleton() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <PublicHeader />

      <main>
        {/* Hero header */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/6%,transparent_70%)]" />
          <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-96 max-w-full" />
            </div>
          </div>
        </section>

        {/* Filter bar */}
        <section className="border-b border-border/40 bg-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3.5 sm:flex-row sm:items-center lg:px-10">
            <Skeleton className="h-9 flex-1 shrink-0 sm:shrink" />
            <ScrollArea orientation="horizontal" className="-mx-6 h-9 px-6 sm:mx-0 sm:px-0">
              <div className="flex gap-3">
                <Skeleton className="h-9 w-36 shrink-0" />
                <Skeleton className="h-9 w-36 shrink-0" />
                <Skeleton className="h-9 w-36 shrink-0" />
                <Skeleton className="h-9 w-36 shrink-0" />
                <Skeleton className="h-9 w-36 shrink-0" />
              </div>
            </ScrollArea>
          </div>
        </section>

        {/* Results count */}
        <div className="mx-auto max-w-7xl px-6 pt-6 lg:px-10">
          <Skeleton className="h-3.5 w-28" />
        </div>

        {/* Card grid */}
        <section className="mx-auto max-w-7xl px-6 py-4 pb-12 lg:px-10 lg:pb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex flex-col space-y-3">
                  <div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-1.5 h-3 w-1/3" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                  <Skeleton className="h-8 w-full" />
                  <div className="flex gap-1.5 border-t border-border/40 pt-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex items-center justify-center gap-1">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

/**
 * Skeleton for /companies — public companies listing page.
 * Matches: hero header + filter bar + results count + 3-column card grid + pagination.
 */
export function CompaniesListSkeleton() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <PublicHeader />

      <main>
        {/* Hero header */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/6%,transparent_70%)]" />
          <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
            <div className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-5 w-80 max-w-full" />
            </div>
          </div>
        </section>

        {/* Filter bar */}
        <section className="sticky top-14 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3.5 sm:flex-row sm:items-center lg:px-10">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-full sm:w-44" />
            <Skeleton className="h-9 w-full sm:w-48" />
          </div>
        </section>

        {/* Results count */}
        <div className="mx-auto max-w-7xl px-6 pt-6 lg:px-10">
          <Skeleton className="h-3.5 w-32" />
        </div>

        {/* Card grid */}
        <section className="mx-auto max-w-7xl px-6 py-4 pb-12 lg:px-10 lg:pb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <Skeleton className="size-11 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-5 w-10 shrink-0 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-full" />
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-12 rounded-md" />
                    <Skeleton className="h-5 w-14 rounded-md" />
                    <Skeleton className="h-5 w-10 rounded-md" />
                  </div>
                  <div className="flex gap-4 border-t border-border/40 pt-3">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex items-center justify-center gap-1">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

/**
 * Skeleton for /jobs/$jobId — public job detail page.
 * Matches: back link + title/company + CTA button + meta badges + 2-col layout.
 */
export function JobDetailSkeleton() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <PublicHeader />

      <main>
        {/* Header section */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/5%,transparent_60%)]" />
          <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-6 lg:px-10 lg:pb-12">
            <BreadcrumbSkeleton segments={2} />
            <div className="mt-8 space-y-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-72" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
              {/* Meta badges */}
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-18 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Body — 2-col grid */}
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-8 lg:grid-cols-3 lg:px-10 lg:py-12">
          {/* Left column */}
          <div className="space-y-10 lg:col-span-2">
            {/* Description */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            {/* Requirements */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <div className="space-y-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="mt-2 size-1.5 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-4">
            {/* Job details card — icon + label rows */}
            <Card>
              <CardContent className="space-y-4">
                <Skeleton className="h-3 w-24" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="size-3.5" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Company card */}
            <Card>
              <CardContent className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="size-4 shrink-0" />
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

/**
 * Skeleton for /companies/$slug — public company profile page.
 * Matches: back link + avatar + title + meta + actions + 2-col layout.
 */
export function CompanyDetailSkeleton() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <PublicHeader />

      <main>
        {/* Hero section */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/5%,transparent_60%)]" />
          <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-6 lg:px-10 lg:pb-12">
            <BreadcrumbSkeleton segments={2} />
            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
              <Skeleton className="size-16 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <Skeleton className="h-8 w-56" />
                  <div className="mt-2 flex flex-wrap gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Body — 2-col grid */}
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-8 lg:grid-cols-3 lg:px-10 lg:py-12">
          {/* Left column */}
          <div className="space-y-10 lg:col-span-2">
            {/* About */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-16" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
            {/* Culture */}
            <div className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            </div>
            {/* Open positions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              <div className="flex flex-col space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center gap-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/5" />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-14" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="size-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-6">
            {/* Tech stack */}
            <Card>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-20" />
                <div className="flex flex-wrap gap-1.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-5 w-18 rounded-full" />
                </div>
              </CardContent>
            </Card>
            {/* At a glance */}
            <Card>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-20" />
                <div className="space-y-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
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

export function DashboardJobsListSkeleton() {
  const { isCompany } = useRouteContext({ from: "/_authenticated/dashboard/jobs/" });
  return isCompany ? <CompanyJobsListSkeleton /> : <CandidateJobsListSkeleton />;
}

function CompanyJobsListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <div className="space-y-4">
        <div className="flex gap-1">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        <div className="min-w-0 rounded-xl border">
          <div className="border-b bg-muted/30 px-4 py-3">
            <div className="flex gap-8">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="ml-auto h-3.5 w-14" />
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8 border-b px-4 py-3.5 last:border-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <div className="ml-auto flex gap-1">
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-14 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CandidateJobsListSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-1 h-4 w-56" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-9 flex-1 shrink-0 sm:shrink rounded-md" />
        <ScrollArea orientation="horizontal" className="h-9">
          <div className="flex gap-3">
            <Skeleton className="h-9 w-36 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-36 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-36 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-36 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-36 shrink-0 rounded-md" />
          </div>
        </ScrollArea>
      </div>

      {/* Results count */}
      <Skeleton className="h-3.5 w-28" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col space-y-3">
              <div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-1.5 h-3 w-1/3" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-8 w-full" />
              <div className="flex gap-1.5 border-t border-border/40 pt-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-1">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/jobs/$jobId parent layout while the shared loader runs.
 * Child routes render their own pending skeletons once the parent resolves.
 */
export function DashboardJobOutletSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for /dashboard/jobs/$jobId/ — candidate job detail page.
 * Company users redirect to the job applicants hub before this renders.
 */
export function DashboardJobDetailSkeleton() {
  return <CandidateJobDetailSkeleton />;
}

/**
 * Skeleton for /dashboard/jobs/$jobId/edit — company job edit form.
 */
export function DashboardJobEditSkeleton() {
  return (
    <div className="space-y-6 pb-28">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-1 h-3 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}

function CandidateJobDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-48" />
      </div>

      {/* 2-col layout */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Description card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
          {/* Requirements card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Skeleton className="mt-2 size-1 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="mt-0.5 size-4 shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          {/* Apply section */}
          <Card>
            <CardContent className="space-y-3 py-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-9 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const jobApplicantsRouteApi = getRouteApi("/_authenticated/dashboard/job-applicants/$jobId");

/**
 * Skeleton for /dashboard/job-applicants/$jobId — company job hub.
 * Matches: header + manage actions + page tabs + tab-specific body.
 */
export function DashboardJobApplicantsSkeleton() {
  const { tab } = jobApplicantsRouteApi.useSearch();
  const isPostingTab = tab === "posting";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPostingTab ? null : (
            <>
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </>
          )}
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {isPostingTab ? <JobPostingTabSkeleton /> : <JobApplicantsTabSkeleton />}
    </div>
  );
}

function JobApplicantsTabSkeleton() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} size="sm" className="border-border/60">
            <CardContent className="py-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      <div className="overflow-hidden rounded-4xl border border-border/60 bg-card shadow-sm ring-1 ring-foreground/5">
        <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="grid gap-4 px-5 py-4 md:grid-cols-[auto_1fr_auto] md:items-center"
            >
              <Skeleton className="size-10 rounded-full" />
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-8 w-24 rounded-full justify-self-end" />
            </div>
          ))}
        </div>
      </div>

      <Card size="sm" className="border-border/60">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </CardContent>
      </Card>
    </>
  );
}

function JobPostingTabSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-3.5 w-40" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Skeleton className="mt-2 size-1 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard — dashboard index page.
 * Matches company and candidate views.
 */
export function DashboardIndexSkeleton() {
  const { isCompany } = useRouteContext({ from: "/_authenticated/dashboard/" });
  return isCompany ? <DashboardCompanyIndexSkeleton /> : <DashboardCandidateIndexSkeleton />;
}

function DashboardCompanyIndexSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-40" />
        <div className="flex flex-wrap gap-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted/25 px-8 py-7 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-8 w-36" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-muted/20 px-5 py-4 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="rounded-xl bg-muted/15 divide-y divide-border/40">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="space-y-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardCandidateIndexSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-1 h-4 w-80" />
      </div>

      {/* Header stats (light rounded cards, same as company) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card px-4 py-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-1 h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Action queue card skeleton (matches ActionQueueCard structure) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <Skeleton className="mt-1 h-3 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                <Skeleton className="mt-1.5 size-2 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-80" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent activity skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-3 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-14" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick links row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-36" />
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/settings — settings form with card sections.
 */
export function DashboardSettingsSkeleton() {
  const { isCompany } = useRouteContext({ from: "/_authenticated/dashboard/settings" });
  return isCompany ? <CompanyDashboardSettingsSkeleton /> : <CandidateDashboardSettingsSkeleton />;
}

function CandidateDashboardSettingsSkeleton() {
  return (
    <div className="space-y-6 pb-28">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1 h-4 w-96 max-w-full" />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3.5 w-72" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3.5 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompanyDashboardSettingsSkeleton() {
  return (
    <div className="space-y-6 pb-28">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1 h-4 w-96 max-w-full" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/team — invite form, pending invites, and members list.
 */
export function DashboardTeamSkeleton() {
  return (
    <div className="space-y-6 pb-28">
      <div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-1 h-4 w-96 max-w-full" />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Skeleton className="h-9 w-full sm:w-40" />
              <Skeleton className="h-9 w-28" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-72" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/applications — candidate applications list.
 * Matches: header + 3 metric cards + application list cards.
 */
export function DashboardApplicationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Metric cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="size-8 rounded-xl" />
              </div>
              <Skeleton className="h-9 w-10" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-52" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Application cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3.5 w-56" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/shortlisted — company shortlist board grouped by role.
 * Matches: page heading + summary metrics + collapsible role sections with candidate rows.
 */
export function DashboardShortlistedSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`shortlisted-metric-${index}`} size="sm">
            <CardHeader className="gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-40" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
          <div
            key={`shortlisted-section-${sectionIndex}`}
            className="overflow-hidden rounded-2xl border bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-52" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>

            <div className="px-5 pb-5 md:px-6">
              <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
                {Array.from({ length: 2 }).map((_, rowIndex) => (
                  <div
                    key={`shortlisted-row-${sectionIndex}-${rowIndex}`}
                    className="px-4 py-4 md:px-5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <Skeleton className="size-10 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-5 w-28 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-44" />
                      </div>
                      <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
                      <div className="flex w-full flex-wrap items-center gap-1.5 md:w-auto">
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-8 w-28 rounded-md" />
                        <Skeleton className="h-8 w-28 rounded-md" />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Skeleton className="h-6 w-64 rounded-2xl" />
                      <Skeleton className="h-6 w-20 rounded-md" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/application/$applicationId — candidate application detail.
 * Matches: back link + header (company, title, badge) + date + status pipeline + interview card + actions.
 */
export function DashboardApplicationDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header: company + title + badge */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-64" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      {/* Date line */}
      <div className="flex gap-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Status pipeline */}
      <div className="space-y-3">
        <div className="flex gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 space-y-1.5">
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-5 w-40 rounded-full" />
        <Card size="sm">
          <CardContent className="space-y-1 py-0">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-3 w-80" />
          </CardContent>
        </Card>
      </div>

      {/* Optional shortlist next-steps card */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-60" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </CardContent>
      </Card>

      {/* Interview invitation card */}
      <Card className="border-warning/20 bg-warning/5">
        <CardContent className="space-y-3 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/applicants/$applicationId — company applicant review.
 * Matches: back nav + header (avatar + name) + status pipeline (5 steps) + actions + report/pre-evaluation.
 */
export function DashboardApplicantReviewSkeleton() {
  const { isCompany } = useRouteContext({
    from: "/_authenticated/dashboard/applicants/$applicationId",
  });
  return isCompany ? <CompanyApplicantReviewSkeleton /> : null;
}

function CompanyApplicantReviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Status section card */}
      <Card size="sm" className="border-border/60">
        <CardContent className="space-y-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>

          {/* 5-step stepper */}
          <div className="space-y-3 border-y border-border/50 py-3">
            <div className="grid grid-cols-5 gap-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <Skeleton className="size-2.5 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
            <div className="space-y-2 lg:flex lg:items-center lg:gap-3">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report snapshot card */}
      <div className="rounded-xl border border-border/70 bg-card p-5">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/applicant-reports/$applicationId — polished report summary.
 * Matches: hero with batch nav (avatar/name/score/actions),
 * summary + score bars, strengths/weaknesses, evidence, insights,
 * screening questions, pre-screening/voice accordion, full audit link.
 */
export function DashboardApplicantReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-4xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7 md:py-6">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="size-20 rounded-3xl" />
          </div>
        </div>
        <Skeleton className="my-5 h-px w-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-48 rounded-md" />
        </div>
      </div>

      {/* Summary + dimension bars */}
      <div className="rounded-4xl border border-border/70 bg-card px-5 py-6 shadow-sm md:px-7">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-[88%]" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Strengths | Weaknesses */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-4xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7 md:py-6"
          >
            <Skeleton className="h-3 w-24" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[90%]" />
              <Skeleton className="h-3 w-[80%]" />
            </div>
          </div>
        ))}
      </div>

      {/* Evidence */}
      <div className="rounded-4xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7 md:py-6">
        <Skeleton className="h-3 w-20" />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="rounded-4xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7 md:py-6">
        <Skeleton className="h-3 w-20" />
        <div className="mt-3 space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="mt-2 size-1 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Screening questions */}
      <div className="rounded-4xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7 md:py-6">
        <Skeleton className="h-3 w-24" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Pre-screening / Voice accordion */}
      <div className="space-y-px rounded-xl border border-border/70 bg-card">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="px-5 py-3.5 md:px-7">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 shrink-0" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Full audit link */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-8 w-40 rounded-md" />
      </div>
    </div>
  );
}

// skeleton for actual interview content.
export function InterviewWorkspacePageSkeleton() {
  return (
    <>
      <header className="flex shrink-0 flex-col gap-3 border-b border-border/60 bg-card px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <Skeleton className="size-5 shrink-0 rounded" />
            <Skeleton className="h-5 w-44 md:h-6 md:w-52" />
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>
          <Skeleton className="h-3 w-32 md:h-3.5 md:w-36" />
          <Skeleton className="mt-1 h-3 w-48 md:w-56" />
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-4 mt-3 md:mx-6">
        <div className="flex gap-1">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 px-4 py-5 md:px-6 md:py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={i % 2 === 0 ? "flex justify-start" : "flex justify-end"}>
              <div className="w-full max-w-[60%] md:max-w-[50%]">
                <Skeleton className="mb-1 h-3 w-10" />
                <Skeleton className="h-9 w-full rounded-[18px]" />
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-border/60 bg-card px-4 pb-3 pt-3 md:px-6">
          <div className="flex items-end gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 shadow-sm">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </>
  );
}

/**
 * Skeleton for /interview and /interview/$interviewId — interview workspace.
 * Matches: left sessions sidebar + top header + chat transcript + pinned composer.
 */
export function InterviewWorkspaceSkeleton() {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 md:items-center md:px-6 md:py-4">
        <div className="min-w-0">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="mt-1.5 h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-muted/30">
        <div className="min-h-0 flex-1 space-y-7 px-5 py-6 md:px-7 md:py-7">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={i % 2 === 0 ? "flex justify-start" : "flex justify-end"}>
              <div className="w-full max-w-[88%] md:max-w-[68%]">
                <Skeleton className="mb-1 h-3 w-12" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 bg-card px-4 pb-4 pt-3 md:px-6 md:pb-5">
          <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 shadow-sm">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Skeleton for the dashboard layout — sidebar + header + content area.
 * Used as pendingComponent on the /_authenticated/dashboard layout route.
 */
export function DashboardLayoutSkeleton() {
  return (
    <div className="flex h-svh w-full">
      {/* Sidebar */}
      <aside className="hidden h-full w-72 shrink-0 bg-sidebar text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border md:flex md:flex-col">
        <div className="p-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
        <div className="flex-1 space-y-3 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="p-3">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* SiteHeader */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-card px-4 py-3 md:px-6 md:py-3.5">
          <BreadcrumbSkeleton segments={2} />
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <div className="space-y-6">
              <div className="space-y-2.5">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InterviewContentSkeleton() {
  return (
    <>
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 md:items-center md:px-6 md:py-4">
        <div className="min-w-0">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="mt-1.5 h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-muted/30">
        <div className="min-h-0 flex-1 space-y-7 px-5 py-6 md:px-7 md:py-7">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={i % 2 === 0 ? "flex justify-start" : "flex justify-end"}>
              <div className="w-full max-w-[88%] md:max-w-[68%]">
                <Skeleton className="mb-1 h-3 w-12" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 bg-card px-4 pb-4 pt-3 md:px-6 md:pb-5">
          <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 shadow-sm">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Skeleton for /dashboard/billing — subscription plans + current plan card.
 */
export function BillingPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/job-batches/$batchId — batch detail page.
 * Matches: header (status badge) + combined timestamp card + ranked candidates + awaiting/expired card.
 */
export function BatchDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header with status badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Single combined timestamp card */}
      <Card size="sm" className="border-border/60">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Ranked candidates */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-3 w-56" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid items-center gap-4 px-5 py-4 md:grid-cols-[2.5rem_auto_1fr_auto]"
              >
                <Skeleton className="h-3 w-6" />
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Awaiting / Expired card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-1 h-3 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Skeleton for /invite/$token — invitation accept page. */
export function InviteAcceptSkeleton() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Skeleton className="size-7 rounded-md" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <Skeleton className="mx-auto h-7 w-48" />
            <Skeleton className="mx-auto mt-2 h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-11 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
