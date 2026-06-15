import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useGoogleLogin } from "@react-oauth/google";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/public-layout";
import { InviteAcceptSkeleton } from "@/components/route-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  acceptInvite,
  currentUserQueryKey,
  getCurrentUser,
} from "@/features/auth/server/functions";
import { getInvitationPreview } from "@/features/companies/server/team-functions";
import { emailsMatch } from "@/shared/google-userinfo";

export const Route = createFileRoute("/invite/$token")({
  loader: async ({ params }) => {
    const preview = await getInvitationPreview({ data: { token: params.token } });
    if (!preview) {
      throw notFound();
    }

    const user = await getCurrentUser();
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
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-2">
            <Logo classname="size-7" />
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Join {preview.companyName}</CardTitle>
            <CardDescription>
              You have been invited to join as{" "}
              <strong>{roleLabels[preview.role as keyof typeof roleLabels]}</strong> using{" "}
              <strong>{preview.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && !sessionMatchesInvite ? (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
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
              <Button className="w-full" onClick={onAcceptWithSession} disabled={isAccepting}>
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
                className="w-full gap-3"
                onClick={onContinueWithGoogle}
                disabled={isAccepting}
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
                {isAccepting ? "Accepting..." : "Continue with Google"}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
