import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginPageShell } from "@/features/auth/components/login-page-shell";
import { useAuth } from "@/features/auth/provider";
import { redirectAfterSignup, signupSearchSchema } from "@/features/auth/signup-search";
import { buildPageHead, PAGE_SEO } from "@/shared/seo";

export const Route = createFileRoute("/company/login")({
  validateSearch: signupSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.user?.role) {
      throw redirect(redirectAfterSignup(search));
    }
  },
  head: () =>
    buildPageHead({
      title: PAGE_SEO.signUp.title,
      description: PAGE_SEO.signUp.description,
      path: "/company/login",
    }),
  component: CompanyLoginPage,
});

const valueProps = [
  {
    title: "Pre-screen every applicant",
    body: "RoundZero reviews every application for role fit so your team does not dig through résumés by hand.",
  },
  {
    title: "Selected candidates interview",
    body: "Strong matches complete an adaptive AI interview on their own time. Zero probes claims, asks follow-ups, and checks role fit.",
  },
  {
    title: "Evidence-backed reports",
    body: "Get a recommendation, strengths, concerns, and conversation evidence before you schedule a human interview.",
  },
];

function CompanyLoginPage() {
  const { signIn, isSigningIn } = useAuth();
  const signupSearch = Route.useSearch();

  const onSignIn = () => {
    signIn("company", signupSearch);
  };

  return (
    <LoginPageShell
      roleEyebrow="For companies"
      headline={
        <>
          Review candidates, not <span className="highlight">resumes</span>.
        </>
      }
      lead="Post a job and RoundZero pre-screens every applicant. Selected candidates complete an adaptive AI interview, and you get a decision-ready report with evidence."
      valueProps={valueProps}
      trustPoints={["No credit card required", "Free to post jobs"]}
      formTitle="Get started"
      formLead="Sign in to post jobs, pre-screen applicants, and review decision-ready candidate reports."
      crossLink={{
        prompt: "Looking to apply for jobs?",
        to: "/candidate/login",
        linkText: "Sign in as a candidate",
      }}
      onSignIn={onSignIn}
      isSigningIn={isSigningIn}
    />
  );
}
