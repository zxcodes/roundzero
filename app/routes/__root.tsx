import { GoogleOAuthProvider } from "@react-oauth/google";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { NotFound } from "@/components/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/auth/provider";
import { getCurrentUser } from "@/features/auth/server/functions";
import { getThemeServerFn } from "@/lib/theme";
import type { RouterContext } from "@/router";
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
        title: "RoundZero | AI-Powered Hiring Platform",
      },
      {
        name: "description",
        content:
          "RoundZero replaces the first interview round with AI-powered interviews. Post jobs, run structured AI interviews, and get evidence-backed candidate reports.",
      },
      {
        name: "keywords",
        content: "hiring, ai interview, recruitment, jobs, candidates, talent acquisition",
      },
      {
        property: "og:title",
        content: "RoundZero | AI-Powered Hiring Platform",
      },
      {
        property: "og:description",
        content:
          "Replace the first interview round with AI-powered interviews. Get scored candidate reports with evidence.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "RoundZero | AI-Powered Hiring Platform",
      },
      {
        name: "twitter:description",
        content:
          "Replace the first interview round with AI-powered interviews. Get scored candidate reports with evidence.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  beforeLoad: async () => {
    try {
      const user = await getCurrentUser();
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
  return (
    <html className={theme} lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: "React Query",
              render: <ReactQueryDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
