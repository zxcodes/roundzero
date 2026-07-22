import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
} from "@tanstack/react-router";

import { NotFound } from "@/components/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
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
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
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

  const isPublicRoute = routes.some((route) => matchesRoute(route, pathname));

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
