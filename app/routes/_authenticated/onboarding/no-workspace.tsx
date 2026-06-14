import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/onboarding/no-workspace")({
  component: NoWorkspacePage,
});

function NoWorkspacePage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>No company workspace</CardTitle>
          <CardDescription>
            Your account is not linked to a company team. Ask your admin for a new invitation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>Waiting for an invite</EmptyTitle>
              <EmptyDescription>
                When you receive an email invitation, open the link and sign in with the invited
                Google account to rejoin.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link to="/company/login">Sign out and switch account</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
