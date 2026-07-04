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
import type { RouterContext } from "@/router";
import type { FileRoutesByTo } from "@/routeTree.gen";
import {
  DEFAULT_META_DESCRIPTION,
  DEFAULT_META_TITLE,
  OG_DESCRIPTION,
  SITE_ICON_LINKS,
  TWITTER_DESCRIPTION,
} from "@/shared/seo";
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
        title: DEFAULT_META_TITLE,
      },
      {
        name: "description",
        content: DEFAULT_META_DESCRIPTION,
      },
      {
        name: "keywords",
        content: "hiring, ai interview, recruitment, jobs, candidates, talent acquisition",
      },
      {
        property: "og:title",
        content: DEFAULT_META_TITLE,
      },
      {
        property: "og:description",
        content: OG_DESCRIPTION,
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
        content: `${import.meta.env.VITE_APP_URL}/og-default.jpeg`,
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
        content: `${import.meta.env.VITE_APP_URL}/og-default.jpeg`,
      },
      {
        name: "twitter:title",
        content: DEFAULT_META_TITLE,
      },
      {
        name: "twitter:description",
        content: TWITTER_DESCRIPTION,
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      ...SITE_ICON_LINKS,
    ],
  }),
  beforeLoad: async ({ context }) => {
    try {
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
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootComponent() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
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
    "/contact",
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
    <html lang="en" suppressHydrationWarning data-force-light={isPublicRoute ? "true" : undefined}>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider forceLight={isPublicRoute}>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
