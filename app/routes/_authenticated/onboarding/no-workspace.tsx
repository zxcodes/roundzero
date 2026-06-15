import { Logout01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useAuth } from "@/features/auth/provider";

export const Route = createFileRoute("/_authenticated/onboarding/no-workspace")({
  component: NoWorkspacePage,
});

function NoWorkspacePage() {
  const { signOut, isSigningOut } = useAuth();

  const onSignOut = () => {
    void signOut();
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>No company workspace</CardTitle>
          <CardDescription>
            You no longer have access to a company team. Sign out, or wait for a new invitation from
            your admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>Access removed or not yet invited</EmptyTitle>
              <EmptyDescription>
                If you were removed from a team, sign out and ask your admin to send a new
                invitation. Open the invite link with the same Google account to rejoin.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button disabled={isSigningOut} onClick={onSignOut} variant="outline">
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
                {isSigningOut ? "Signing out..." : "Sign out"}
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
