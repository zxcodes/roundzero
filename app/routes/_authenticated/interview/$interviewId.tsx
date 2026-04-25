import { ArrowLeft01Icon, BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/interview/$interviewId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }

    validateUuidParams({ interviewId: params.interviewId });
  },
  component: InterviewRoutePage,
});

function InterviewRoutePage() {
  const { interviewId } = Route.useParams();

  return (
    <div className="animate-fade-in space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/dashboard/applications">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
          Applications
        </Link>
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-4" />
            </div>
            <Badge variant="outline" className="font-mono text-[11px]">
              Interview Ready
            </Badge>
          </div>
          <CardTitle>Zero interview session</CardTitle>
          <CardDescription>
            This link now routes directly to the interview session. The full chat surface lands in
            Phase 6.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Your interview session ID is{" "}
            <span className="font-mono text-foreground">{interviewId}</span>.
          </p>
          <p>
            You can return to your application details while we finish wiring the interview chat.
          </p>
          <Button variant="outline" asChild>
            <Link to="/dashboard/applications">Back to applications</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
