import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { ErrorBoundary } from "./components/error-boundary";
import { NotFound } from "./components/not-found";
import { RouteSpinner } from "./components/route-spinner";
import type { getCurrentUser } from "./features/auth/server-fns";
import { routeTree } from "./routeTree.gen";

export type User = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export interface RouterContext {
  user: User | null;
  isCompany: boolean;
  isCandidate: boolean;
  queryClient: QueryClient;
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
    context: {
      user: null,
      isCompany: false,
      isCandidate: false,
      queryClient,
    },
    defaultErrorComponent: ErrorBoundary,
    defaultNotFoundComponent: NotFound,
    defaultPendingComponent: RouteSpinner,
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
