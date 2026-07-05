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
    title: "Adaptive interviews",
    body: "Zero evaluates how candidates think and communicate, not just what is on their résumé.",
  },
  {
    title: "Ranked reports",
    body: "Every applicant arrives scored with strengths, concerns, and evidence from the conversation.",
  },
  {
    title: "Hire with confidence",
    body: "Clear recommendations before your team schedules a single human interview.",
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
      lead="Post a job and RoundZero handles the initial screen. Every candidate gets a structured, adaptive AI interview, and you get a scored report with evidence."
      valueProps={valueProps}
      trustPoints={["No credit card required", "Free to post jobs"]}
      formTitle="Get started"
      formLead="Sign in to post jobs, run AI interviews, and review scored candidate reports."
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
