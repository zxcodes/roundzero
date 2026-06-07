import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { ErrorBoundary } from "./components/error-boundary";
import { NotFound } from "./components/not-found";
import type { getCurrentUser } from "./features/auth/server/functions";
import type { getMyCandidateProfile } from "./features/candidates/server/functions";
import type { getMyCompany } from "./features/companies/server/functions";
import type { getMyJobCounts } from "./features/jobs/server/functions";
import { routeTree } from "./routeTree.gen";

export type User = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type Company = NonNullable<Awaited<ReturnType<typeof getMyCompany>>>;
export type CandidateProfile = NonNullable<Awaited<ReturnType<typeof getMyCandidateProfile>>>;
export type JobCounts = NonNullable<Awaited<ReturnType<typeof getMyJobCounts>>>;

export interface RouterContext {
  user: User | null;
  isCompany: boolean;
  isCandidate: boolean;
  queryClient: QueryClient;
  company: Company | null;
  subscription: { plan: string; status: string; isActive: boolean } | null;
  jobCounts: JobCounts | null;
  candidateProfile: CandidateProfile | null;
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
      },
    },
  });

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultViewTransition: true,
    context: {
      user: null,
      isCompany: false,
      isCandidate: false,
      queryClient,
      company: null,
      subscription: null,
      jobCounts: null,
      candidateProfile: null,
    },
    defaultErrorComponent: ErrorBoundary,
    defaultNotFoundComponent: NotFound,
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
