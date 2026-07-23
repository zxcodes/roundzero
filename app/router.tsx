import * as Sentry from "@sentry/tanstackstart-react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { sentryOptions } from "@/shared/sentry";

import { ErrorBoundary } from "./components/error-boundary";
import { NotFound } from "./components/not-found";
import type { getCurrentUser } from "./features/auth/server/functions";
import { companyBootstrapQueryKey } from "./features/companies/server/functions";
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
        staleTime: 1000 * 60,
      },
    },
  });

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultStaleTime: 30_000,
    defaultPreloadStaleTime: 30_000,
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
      ...sentryOptions,
      integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
    });
  }

  setupRouterSsrQueryIntegration({ router, queryClient });

  const invalidate = router.invalidate.bind(router);
  router.invalidate = (opts) => {
    void queryClient.invalidateQueries({ queryKey: companyBootstrapQueryKey });
    return invalidate(opts);
  };

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
