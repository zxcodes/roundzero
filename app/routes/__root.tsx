import { GoogleOAuthProvider } from "@react-oauth/google";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
  useRouteContext,
} from "@tanstack/react-router";
import { NotFound } from "@/components/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/auth/provider";
import { currentUserQueryKey, getCurrentUser } from "@/features/auth/server/functions";
import { getThemeServerFn } from "@/lib/theme";
import type { RouterContext } from "@/router";
import type { FileRoutesByTo } from "@/routeTree.gen";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "RoundZero | Replace Your First Interview Round with AI",
      },
      {
        name: "description",
        content:
          "Run AI-driven first-round interviews and get ranked candidates with structured evaluation reports.",
      },
      {
        name: "keywords",
        content: "hiring, ai interview, recruitment, jobs, candidates, talent acquisition",
      },
      {
        property: "og:title",
        content: "RoundZero | Replace Your First Interview Round with AI",
      },
      {
        property: "og:description",
        content:
          "Run AI-driven first-round interviews and get ranked candidates with structured evaluation reports.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:site_name",
        content: "RoundZero",
      },
      {
        property: "og:logo",
        content: `${import.meta.env.VITE_APP_URL}/apple-touch-icon.png`,
      },
      {
        property: "og:image",
        content: `${import.meta.env.VITE_APP_URL}/og-default.png`,
      },
      {
        property: "og:image:width",
        content: "1200",
      },
      {
        property: "og:image:height",
        content: "630",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:image",
        content: `${import.meta.env.VITE_APP_URL}/og-default.png`,
      },
      {
        name: "twitter:title",
        content: "RoundZero | Replace Your First Interview Round with AI",
      },
      {
        name: "twitter:description",
        content:
          "Run AI-driven first-round interviews and get ranked candidates with structured evaluation reports.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    try {
      // Cache the user in React Query so repeated navigations don't re-round-trip
      // to the worker. Auth mutations invalidate `currentUserQueryKey` to refresh.
      // `fetchQuery` (not `ensureQueryData`) is required so that after invalidation
      // the router waits for fresh data rather than receiving stale cached data.
      const user = await context.queryClient.fetchQuery({
        queryKey: currentUserQueryKey,
        queryFn: () => getCurrentUser(),
        staleTime: 30_000,
      });
      return {
        user,
        isCompany: user?.role === "company",
        isCandidate: user?.role === "candidate",
      };
    } catch {
      return { user: null, isCompany: false, isCandidate: false };
    }
  },
  loader: () => getThemeServerFn(),
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootComponent() {
  const theme = Route.useLoaderData();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <Outlet />
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const theme = Route.useLoaderData();
  const { user } = useRouteContext({ from: "__root__" });
  const { pathname } = useLocation();

  const routes: (keyof FileRoutesByTo)[] = [
    "/",
    "/jobs",
    "/jobs/$jobId",
    "/companies",
    "/companies/$slug",
    "/candidate/login",
    "/company/login",
    "/privacy",
    "/tos",
  ];

  const matchesRoute = (route: string, pathname: string) => {
    const routeParts = route.split("/");
    const pathParts = pathname.split("/");

    if (routeParts.length !== pathParts.length) {
      return false;
    }

    return routeParts.every((part, index) => {
      return part.startsWith("$") || part === pathParts[index];
    });
  };

  const isPublicRoute = !user && routes.some((route) => matchesRoute(route, pathname));

  return (
    <html className={isPublicRoute ? "light" : theme} lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
