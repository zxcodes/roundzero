import { useRouteContext } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic fallback skeleton used as the default pending component for all routes.
 */
export function RouteSpinner() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton for /jobs — public jobs listing page.
 * Matches: hero header + filter bar + results count + 3-column card grid.
 */
export function JobsListSkeleton() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <PublicHeader />

      <main>
        {/* Hero header */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/6%,transparent_70%)]" />
          <div className="relative mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-96 max-w-full" />
            </div>
          </div>
        </section>

        {/* Filter bar */}
        <section className="sticky top-14 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3.5 sm:flex-row sm:items-center lg:px-8">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-full sm:w-36" />
            <Skeleton className="h-9 w-full sm:w-36" />
            <Skeleton className="h-9 w-full sm:w-36" />
            <Skeleton className="h-9 w-full sm:w-36" />
            <Skeleton className="h-9 w-full sm:w-36" />
          </div>
        </section>

        {/* Results count */}
        <div className="mx-auto max-w-6xl px-6 pt-6 lg:px-8">
          <Skeleton className="h-3.5 w-28" />
        </div>

        {/* Card grid */}
        <section className="mx-auto max-w-6xl px-6 py-4 pb-12 lg:px-8 lg:pb-16">
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
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

/**
 * Skeleton for /companies — public companies listing page.
 * Matches: hero header + filter bar + results count + 3-column card grid.
 */
export function CompaniesListSkeleton() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <PublicHeader />

      <main>
        {/* Hero header */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/6%,transparent_70%)]" />
          <div className="relative mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-5 w-80 max-w-full" />
            </div>
          </div>
        </section>

        {/* Filter bar */}
        <section className="sticky top-14 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3.5 sm:flex-row sm:items-center lg:px-8">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-full sm:w-44" />
            <Skeleton className="h-9 w-full sm:w-48" />
          </div>
        </section>

        {/* Results count */}
        <div className="mx-auto max-w-6xl px-6 pt-6 lg:px-8">
          <Skeleton className="h-3.5 w-32" />
        </div>

        {/* Card grid */}
        <section className="mx-auto max-w-6xl px-6 py-4 pb-12 lg:px-8 lg:pb-16">
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
          <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-6 lg:px-8 lg:pb-12">
            {/* Back link */}
            <Skeleton className="h-4 w-20" />
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
        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-8 lg:grid-cols-3 lg:px-8 lg:py-12">
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
          <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-6 lg:px-8 lg:pb-12">
            <Skeleton className="h-4 w-28" />
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
        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-8 lg:grid-cols-3 lg:px-8 lg:py-12">
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
                        <div className="flex gap-3">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-14" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                      <Skeleton className="size-4 shrink-0" />
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
    <div className="animate-fade-in space-y-6">
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

        <div className="overflow-hidden rounded-xl border">
          <div className="border-b bg-muted/30 px-4 py-3">
            <div className="flex gap-8">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-10" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="ml-auto h-3.5 w-14" />
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8 border-b px-4 py-3.5 last:border-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-14 rounded-full" />
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
    <div className="animate-fade-in space-y-6">
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-1 h-4 w-56" />
      </div>

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
    </div>
  );
}

/**
 * Skeleton for /dashboard/jobs/$jobId — dashboard job detail page.
 * Matches: back button + title/status + date + action buttons + 2-col layout.
 */
export function DashboardJobDetailSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Skeleton className="mt-0.5 size-9 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-48" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
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
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/job-applicants/$jobId — applicants list page.
 * Matches: back nav + header (title + badges) + applicant list cards.
 */
export function DashboardJobApplicantsSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Back nav + badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-28 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Applicant list — clickable cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} size="sm" className="ring-foreground/5">
            <CardContent className="py-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="mt-0.5 h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="size-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard — dashboard index with welcome + metric cards.
 */
export function DashboardIndexSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-1 h-4 w-80" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-72" />
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-7 w-12" />
                <Skeleton className="mt-2 h-3 w-28" />
              </div>
            ))}
            <div className="rounded-lg border p-3 md:col-span-3">
              <Skeleton className="h-4 w-48" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-30" />
          <Skeleton className="h-3 w-64" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-muted bg-background/60">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton for /dashboard/settings — settings form with card sections.
 */
export function DashboardSettingsSkeleton() {
  return (
    <div className="animate-fade-in space-y-6 pb-28">
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
 * Skeleton for /dashboard/applications — candidate applications list.
 * Matches: header + 3 metric cards + application list cards.
 */
export function DashboardApplicationsSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
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
            <CardContent className="py-0">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3.5 w-40" />
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
 * Skeleton for /dashboard/application/$applicationId — candidate application detail.
 * Matches: back link + header (company, title, badge) + status pipeline + actions + snapshot.
 */
export function DashboardApplicationDetailSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Back link */}
      <Skeleton className="h-8 w-28 rounded-md" />

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

      {/* Status pipeline card */}
      <div className="space-y-2 rounded-2xl border border-border/70 p-5">
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-3 w-80" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      {/* Submitted profile */}
      <div className="space-y-4">
        <Skeleton className="h-3 w-28" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 p-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-1.5 h-4 w-48" />
          </div>
          <div className="rounded-xl border border-border/70 p-3">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="mt-1.5 h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for /dashboard/applicants/$applicationId — company applicant review.
 * Matches: back nav + header (avatar + name + badges) + status pipeline + actions + snapshot.
 */
export function DashboardApplicantReviewSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Back nav with prev/next */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-28 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Avatar + name + badges */}
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
        </div>
      </div>

      {/* Status pipeline */}
      <Card size="sm">
        <CardContent className="space-y-2 py-0">
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="size-2 rounded-full" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-72" />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-48 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Snapshot */}
      <div className="space-y-4">
        <Skeleton className="h-3 w-28" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card size="sm">
            <CardContent className="py-0">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-1.5 h-4 w-48" />
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="py-0">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="mt-1.5 h-4 w-28" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for /interview and /interview/$interviewId — interview workspace.
 * Matches: left sessions sidebar + top header + chat transcript + pinned composer.
 */
export function InterviewWorkspaceSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full gap-2 bg-background p-2 text-foreground animate-fade-in">
      <aside className="hidden h-full w-72 shrink-0 rounded-2xl bg-sidebar text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border md:flex md:min-h-0 md:flex-col">
        <div className="p-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-1.5 h-3 w-36" />
        </div>
        <div className="space-y-2.5 p-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-sidebar-accent p-3.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-1.5 h-3 w-24" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          ))}
        </div>

        <div className="p-2">
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
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
    </div>
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
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <div className="animate-fade-in space-y-6">
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
 * Matches: header + 3 timestamp cards + ranked candidate list.
 */
export function BatchDetailSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-60" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-2 h-3.5 w-72" />
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="size-10 rounded-2xl" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
