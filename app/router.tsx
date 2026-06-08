import * as Sentry from "@sentry/tanstackstart-react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { ErrorBoundary } from "./components/error-boundary";
import { NotFound } from "./components/not-found";
import type { getCurrentUser } from "./features/auth/server/functions";
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
    defaultPreloadStaleTime: 30_000,
    defaultViewTransition: true,
    context: {
      user: null,
      isCompany: false,
      isCandidate: false,
      queryClient,
    },
    defaultErrorComponent: ErrorBoundary,
    defaultNotFoundComponent: NotFound,
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
  });

  if (!router.isServer && !import.meta.env.DEV) {
    Sentry.init({
      dsn: "https://93220926b2dbb8136dfb5e8d25f7a3fd@o4511527312687104.ingest.us.sentry.io/4511527318388736",
      sendDefaultPii: true,
    });
  }

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
