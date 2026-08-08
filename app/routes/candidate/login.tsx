import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginPageShell } from "@/features/auth/components/login-page-shell";
import { GoogleSignInProvider, useGoogleSignIn } from "@/features/auth/provider";
import { currentUserQueryKey, getCurrentUser } from "@/features/auth/server/functions";
import { redirectAfterSignup, signupSearchSchema } from "@/features/auth/signup-search";
import { buildPageHead, NOINDEX_ROBOTS, PAGE_SEO } from "@/shared/seo";

export const Route = createFileRoute("/candidate/login")({
  validateSearch: signupSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const user = await context.queryClient.fetchQuery({
      queryKey: currentUserQueryKey,
      queryFn: () => getCurrentUser(),
      staleTime: 30_000,
    });
    if (user?.role) {
      throw redirect(redirectAfterSignup(search));
    }
  },
  head: () =>
    buildPageHead({
      title: PAGE_SEO.signIn.title,
      description: PAGE_SEO.signIn.description,
      path: "/candidate/login",
      robots: NOINDEX_ROBOTS,
    }),
  component: CandidateLoginRoute,
});

function CandidateLoginRoute() {
  return (
    <GoogleSignInProvider>
      <CandidateLoginPage />
    </GoogleSignInProvider>
  );
}

const valueProps = [
  {
    title: "Evaluated beyond your résumé",
    body: "Every application is reviewed for real role fit, not keyword matching.",
  },
  {
    title: "Interview when invited, on your time",
    body: "Selected candidates complete an adaptive interview on their own time, with a 15–20 minute evaluation estimate and a separate short voice assessment.",
  },
  {
    title: "Show how you think",
    body: "Adaptive follow-ups and evidence-backed reports help companies see the substance of your work.",
  },
];

function CandidateLoginPage() {
  const { signIn, isSigningIn } = useGoogleSignIn();
  const signupSearch = Route.useSearch();

  const onSignIn = () => {
    signIn("candidate", signupSearch);
  };

  return (
    <LoginPageShell
      roleEyebrow="For job seekers"
      headline={
        <>
          Skip the <span className="highlight">resume black hole</span>.
        </>
      }
      lead="Most applications disappear into an inbox. On RoundZero, every application is pre-screened for role fit, and selected candidates complete an adaptive AI interview on their own time. No scheduling, no phone screens."
      valueProps={valueProps}
      trustPoints={["Always free for candidates", "No hidden fees"]}
      formTitle="Get started"
      formLead="Sign in to browse jobs, apply with one click, and get evaluated beyond your résumé."
      crossLink={{
        prompt: "Looking to hire?",
        to: "/company/login",
        linkText: "Sign in as a company",
      }}
      onSignIn={onSignIn}
      isSigningIn={isSigningIn}
    />
  );
}
