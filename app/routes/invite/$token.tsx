import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useGoogleLogin } from "@react-oauth/google";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Logo, PublicFooter, PublicHeader } from "@/components/public-layout";
import { InviteAcceptSkeleton } from "@/components/route-skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/features/auth/components/google-icon";
import {
  acceptInvite,
  currentUserQueryKey,
  getCurrentUser,
} from "@/features/auth/server/functions";
import { getInvitationPreview } from "@/features/companies/server/team-functions";
import { emailsMatch } from "@/shared/google-userinfo";
import { noindexHead } from "@/shared/seo";

export const Route = createFileRoute("/invite/$token")({
  loader: async ({ params }) => {
    const [preview, user] = await Promise.all([
      getInvitationPreview({ data: { token: params.token } }),
      getCurrentUser(),
    ]);
    if (!preview) {
      throw notFound();
    }

    return { preview, user };
  },
  pendingComponent: InviteAcceptSkeleton,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Join ${loaderData.preview.companyName} | RoundZero`
          : "Invitation | RoundZero",
      },
      ...noindexHead().meta,
    ],
  }),
  component: InviteAcceptPage,
});

const roleLabels = {
  admin: "Admin",
  member: "Member",
} as const;

function InviteAcceptPage() {
  const { preview, user } = Route.useLoaderData();
  const { token } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const acceptFn = useServerFn(acceptInvite);
  const [isAccepting, setIsAccepting] = useState(false);
  const pendingTokenRef = useRef(token);

  const sessionMatchesInvite = user ? emailsMatch(user.email, preview.email) : false;

  const completeAccept = async (accessToken?: string) => {
    setIsAccepting(true);
    try {
      const result = await acceptFn({
        data: {
          token: pendingTokenRef.current,
          access_token: accessToken,
        },
      });

      queryClient.setQueryData(currentUserQueryKey, result.user);

      if (result.onboardingComplete) {
        await router.navigate({ to: "/dashboard" });
      } else {
        await router.navigate({ to: "/onboarding/company" });
      }
      await router.invalidate();
    } catch (error) {
      console.error("Invite accept error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      await completeAccept(tokenResponse.access_token);
    },
    onError: () => {
      setIsAccepting(false);
      toast.error("Google sign in failed");
    },
  });

  const onContinueWithGoogle = () => {
    setIsAccepting(true);
    googleLogin();
  };

  const onAcceptWithSession = () => {
    void completeAccept();
  };

  return (
    <div className="calm flex min-h-svh flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <Link to="/" className="flex items-center gap-1">
              <Logo />
              <span className="font-heading text-[19px] leading-none font-medium tracking-[-0.01em]">
                RoundZero
              </span>
            </Link>
          </div>

          <section className="space-y-5 rounded-3xl border border-border/60 px-5 py-6">
            <div className="text-center">
              <span className="eyebrow">Team invite</span>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                Join {preview.companyName}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                You have been invited to join as{" "}
                <strong>{roleLabels[preview.role as keyof typeof roleLabels]}</strong> using{" "}
                <strong>{preview.email}</strong>.
              </p>
            </div>

            <div className="space-y-4">
              {!preview.canAccept ? (
                <Alert variant="destructive">
                  <AlertTitle>Team is full</AlertTitle>
                  <AlertDescription>{preview.capacityMessage}</AlertDescription>
                </Alert>
              ) : null}

              {user && !sessionMatchesInvite ? (
                <div className="space-y-3 rounded-2xl bg-muted/30 px-4 py-4 text-sm">
                  <p>
                    You are signed in as <strong>{user.email}</strong>. Sign in with{" "}
                    <strong>{preview.email}</strong> to accept this invitation.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/company/login">Switch account</Link>
                  </Button>
                </div>
              ) : null}

              {sessionMatchesInvite ? (
                <Button
                  className="w-full rounded-full"
                  onClick={onAcceptWithSession}
                  disabled={isAccepting || !preview.canAccept}
                >
                  {isAccepting ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      strokeWidth={2}
                      className="size-4 animate-spin"
                    />
                  ) : null}
                  Accept invitation
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-3 rounded-full"
                  onClick={onContinueWithGoogle}
                  disabled={isAccepting || !preview.canAccept}
                >
                  {isAccepting ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      strokeWidth={2}
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <GoogleIcon />
                  )}
                  {isAccepting ? "Accepting" : "Continue with Google"}
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link to="/tos" className="underline underline-offset-2">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
