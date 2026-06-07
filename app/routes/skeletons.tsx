import { createFileRoute } from "@tanstack/react-router";
import {
  BatchDetailSkeleton,
  BillingPageSkeleton,
  CompaniesListSkeleton,
  CompanyDetailSkeleton,
  DashboardApplicantReportSkeleton,
  DashboardApplicantReviewSkeleton,
  DashboardApplicationDetailSkeleton,
  DashboardApplicationsSkeleton,
  DashboardIndexSkeleton,
  DashboardJobApplicantsSkeleton,
  DashboardJobDetailSkeleton,
  DashboardLayoutSkeleton,
  InterviewContentSkeleton,
  InterviewWorkspacePageSkeleton,
  InterviewWorkspaceSkeleton,
  JobDetailSkeleton,
  JobsListSkeleton,
} from "@/components/route-skeletons";

export const Route = createFileRoute("/skeletons")({
  head: () => ({
    meta: [{ title: "Skeleton Gallery | RoundZero" }],
  }),
  component: SkeletonGallery,
});

function SkeletonGallery() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <h1 className="text-2xl font-bold">Skeleton Gallery</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Skeleton components defined in route-skeletons.tsx
        </p>

        <div className="mt-10 space-y-8">
          <FullPage label="JobsListSkeleton (public)">
            <JobsListSkeleton />
          </FullPage>
          <FullPage label="CompaniesListSkeleton (public)">
            <CompaniesListSkeleton />
          </FullPage>
          <FullPage label="JobDetailSkeleton (public)">
            <JobDetailSkeleton />
          </FullPage>
          <FullPage label="CompanyDetailSkeleton (public)">
            <CompanyDetailSkeleton />
          </FullPage>
          <Inline label="DashboardIndexSkeleton">
            <DashboardIndexSkeleton />
          </Inline>
          <Inline label="DashboardJobDetailSkeleton">
            <DashboardJobDetailSkeleton />
          </Inline>
          <Inline label="DashboardJobApplicantsSkeleton">
            <DashboardJobApplicantsSkeleton />
          </Inline>
          <Inline label="DashboardApplicationsSkeleton">
            <DashboardApplicationsSkeleton />
          </Inline>
          <Inline label="DashboardApplicationDetailSkeleton">
            <DashboardApplicationDetailSkeleton />
          </Inline>
          <Inline label="DashboardApplicantReviewSkeleton">
            <DashboardApplicantReviewSkeleton />
          </Inline>
          <Inline label="DashboardApplicantReportSkeleton">
            <DashboardApplicantReportSkeleton />
          </Inline>
          <Inline label="BillingPageSkeleton">
            <BillingPageSkeleton />
          </Inline>
          <Inline label="BatchDetailSkeleton">
            <BatchDetailSkeleton />
          </Inline>
          <Constrained label="InterviewWorkspacePageSkeleton" h="500px">
            <InterviewWorkspacePageSkeleton />
          </Constrained>
          <Constrained label="InterviewWorkspaceSkeleton" h="500px">
            <InterviewWorkspaceSkeleton />
          </Constrained>
          <Constrained label="DashboardLayoutSkeleton" h="500px">
            <DashboardLayoutSkeleton />
          </Constrained>
          <Constrained label="InterviewContentSkeleton" h="500px">
            <InterviewContentSkeleton />
          </Constrained>
        </div>

        <div className="mt-10 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          <strong>Not shown here:</strong> DashboardJobsListSkeleton · DashboardSettingsSkeleton
          <br />
          These use <code>useRouteContext</code> and need their parent route to render.
        </div>
      </div>
    </div>
  );
}

function Label({ label }: { label: string }) {
  return (
    <div className="border-b bg-muted/30 px-4 py-2 text-sm font-medium text-muted-foreground">
      {label}
    </div>
  );
}

function Inline({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border">
      <Label label={label} />
      <div className="p-6">{children}</div>
    </div>
  );
}

function FullPage({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <Label label={label} />
      {children}
    </div>
  );
}

function Constrained({
  label,
  h,
  children,
}: {
  label: string;
  h: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <Label label={label} />
      <div style={{ height: h }}>{children}</div>
    </div>
  );
}
