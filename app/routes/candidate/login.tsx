import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginPageShell } from "@/features/auth/components/login-page-shell";
import { useAuth } from "@/features/auth/provider";
import { redirectAfterSignup, signupSearchSchema } from "@/features/auth/signup-search";
import { buildPageHead, PAGE_SEO } from "@/shared/seo";

export const Route = createFileRoute("/candidate/login")({
  validateSearch: signupSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.user?.role) {
      throw redirect(redirectAfterSignup(search));
    }
  },
  head: () =>
    buildPageHead({
      title: PAGE_SEO.signIn.title,
      description: PAGE_SEO.signIn.description,
      path: "/candidate/login",
    }),
  component: CandidateLoginPage,
});

const valueProps = [
  {
    title: "Get evaluated beyond your résumé",
    body: "Show how you think and solve problems in a real conversation.",
  },
  {
    title: "Interview on your schedule",
    body: "Twenty to forty minute async conversations, anytime, anywhere.",
  },
  {
    title: "Never filtered by keywords",
    body: "Companies see an evidence-backed report, not another résumé in the stack.",
  },
];

function CandidateLoginPage() {
  const { signIn, isSigningIn } = useAuth();
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
      lead="Most applications disappear into an inbox. On RoundZero, every application gets an AI interview, so companies see what you can actually do. No scheduling, no phone screens."
      valueProps={valueProps}
      trustPoints={["Always free for candidates", "No hidden fees"]}
      formTitle="Get started"
      formLead="Sign in to browse jobs, apply with one click, and show companies what you can do."
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
