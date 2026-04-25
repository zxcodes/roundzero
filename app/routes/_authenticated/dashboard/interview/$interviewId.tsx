import {
  ArrowLeft01Icon,
  BubbleChatIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { InterviewSessionSkeleton } from "@/components/route-skeletons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { InterviewComposer } from "@/features/interviews/components/interview-composer";
import {
  type InterviewAgentMessage,
  InterviewTranscript,
} from "@/features/interviews/components/interview-transcript";
import {
  cancelMyInterview,
  completeMyInterview,
  getMyInterview,
  getMyInterviewState,
  getMyInterviews,
  startMyInterview,
  submitInterviewMessage,
} from "@/features/interviews/server/functions";
import { cn } from "@/lib/utils";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/dashboard/interview/$interviewId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }

    validateUuidParams({ interviewId: params.interviewId });
  },
  loader: async ({ params }) => {
    const interviews = await getMyInterviews();
    const interview = await getMyInterview({
      data: { interviewId: params.interviewId },
    });

    if (!interview) {
      throw notFound();
    }

    const state = await getMyInterviewState({
      data: { interviewId: params.interviewId },
    });

    return { interview, interviews, state };
  },
  pendingComponent: InterviewSessionSkeleton,
  component: InterviewRoutePage,
});

const statusConfig: Record<
  string,
  { label: string; variant: "outline" | "secondary" | "destructive" }
> = {
  pending: { label: "Ready", variant: "outline" },
  in_progress: { label: "In progress", variant: "outline" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  expired: { label: "Expired", variant: "destructive" },
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

function getSessionLabel(value: string) {
  if (value === "in_progress") return "In progress";
  if (value === "pending") return "Ready";
  if (value === "completed") return "Completed";
  if (value === "cancelled") return "Cancelled";
  if (value === "expired") return "Expired";
  return value;
}

function InterviewRoutePage() {
  const { interview, interviews, state } = Route.useLoaderData();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const loaderMessages = state?.messages ?? [];
  const [localMessages, setLocalMessages] = useState<InterviewAgentMessage[] | null>(null);
  const lastLoaderRef = useRef(loaderMessages);

  if (lastLoaderRef.current !== loaderMessages) {
    lastLoaderRef.current = loaderMessages;
    if (localMessages !== null) {
      setLocalMessages(null);
    }
  }

  const messages = localMessages ?? loaderMessages;

  const startInterviewFn = useServerFn(startMyInterview);
  const cancelInterviewFn = useServerFn(cancelMyInterview);
  const completeInterviewFn = useServerFn(completeMyInterview);
  const submitMessageFn = useServerFn(submitInterviewMessage);

  const startMutation = useMutation({
    mutationFn: startInterviewFn,
    onSuccess: async () => {
      toast.success("Interview started.");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not start interview. Please try again."));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInterviewFn,
    onSuccess: async () => {
      toast.success("Interview cancelled.");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not cancel interview. Please try again."));
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeInterviewFn,
    onSuccess: async () => {
      toast.success("Interview submitted.");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not submit interview. Please try again."));
    },
  });

  const messageMutation = useMutation({
    mutationFn: submitMessageFn,
    onSuccess: (data) => {
      if (data) {
        setLocalMessages(data.messages);
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not send message. Please try again."));
    },
  });

  const onStart = () => {
    startMutation.mutate({ data: { interviewId: interview.id } });
  };

  const onCancel = () => {
    cancelMutation.mutate({ data: { interviewId: interview.id } });
  };

  const onComplete = () => {
    completeMutation.mutate({ data: { interviewId: interview.id } });
  };

  const onSendMessage = (content: string) => {
    messageMutation.mutate({
      data: { interviewId: interview.id, content },
    });
  };

  const status = statusConfig[interview.status] ?? {
    label: interview.status,
    variant: "outline" as const,
  };

  const isPending = interview.status === "pending";
  const isInProgress = interview.status === "in_progress";
  const isCompleted = interview.status === "completed";
  const isCancelled = interview.status === "cancelled";
  const isExpired = interview.status === "expired";
  const isTerminal = isCompleted || isCancelled || isExpired;

  return (
    <div className="flex min-h-0 flex-1 border-t bg-background">
      <aside className="hidden w-[340px] shrink-0 border-r lg:flex lg:min-h-0 lg:flex-col">
        <div className="flex items-center gap-2 px-4 py-3">
          <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Interviews</h2>
        </div>
        <Separator />
        <ScrollArea className="h-full min-h-0">
          <ul className="space-y-1 p-2">
            {interviews.map((session) => {
              const active = session.id === interview.id;

              return (
                <li key={session.id}>
                  <Link
                    to="/dashboard/interview/$interviewId"
                    params={{ interviewId: session.id }}
                    className={cn(
                      "block rounded-xl border px-4 py-3 transition-colors",
                      active ? "border-border/70 bg-muted" : "border-transparent hover:bg-muted/50",
                    )}
                  >
                    <p className="truncate text-sm font-medium">{session.jobTitle}</p>
                    <p className="truncate text-xs text-muted-foreground">{session.companyName}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {getSessionLabel(session.status)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="-ml-2 lg:hidden">
                <Link to="/dashboard/interviews">
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                  Interviews
                </Link>
              </Button>
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="lg:hidden">
                    <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} className="size-4" />
                    <span className="sr-only">Open interview list</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <SheetTitle className="sr-only">Interview sessions</SheetTitle>
                  <div className="flex items-center gap-2 border-b px-4 py-3">
                    <HugeiconsIcon
                      icon={BubbleChatIcon}
                      strokeWidth={2}
                      className="size-4 text-primary"
                    />
                    <h2 className="text-sm font-semibold">Interviews</h2>
                  </div>
                  <ScrollArea className="h-[calc(100vh-60px)]">
                    <ul className="space-y-1 p-2">
                      {interviews.map((session) => {
                        const active = session.id === interview.id;

                        return (
                          <li key={session.id}>
                            <Link
                              to="/dashboard/interview/$interviewId"
                              params={{ interviewId: session.id }}
                              onClick={() => setSheetOpen(false)}
                              className={cn(
                                "block rounded-xl border px-4 py-3 transition-colors",
                                active
                                  ? "border-border/70 bg-muted"
                                  : "border-transparent hover:bg-muted/50",
                              )}
                            >
                              <p className="truncate text-sm font-medium">{session.jobTitle}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {session.companyName}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {getSessionLabel(session.status)}
                              </p>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
              <h1 className="truncate text-base font-semibold md:text-lg">{interview.jobTitle}</h1>
              <Badge variant={status.variant} className="font-mono text-[11px]">
                {status.label}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground md:text-sm">
              {interview.companyName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isPending || isInProgress ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    disabled={cancelMutation.isPending}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this interview?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will withdraw your application for {interview.jobTitle} at{" "}
                      {interview.companyName}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep interview</AlertDialogCancel>
                    <AlertDialogAction onClick={onCancel} variant="destructive">
                      Cancel interview
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}

            {isPending || isInProgress ? (
              <Button
                size="sm"
                onClick={isPending ? onStart : onComplete}
                disabled={startMutation.isPending || completeMutation.isPending}
              >
                <HugeiconsIcon
                  icon={isPending ? BubbleChatIcon : CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-4"
                />
                {isPending ? "Start" : "Submit interview"}
              </Button>
            ) : null}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-3 md:px-5 md:py-4">
          {isTerminal ? (
            <Alert className="mb-3 shrink-0 rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100">
              <AlertDescription className="text-zinc-300">
                {isCompleted
                  ? "Interview submitted. Zero is compiling your evaluation report."
                  : isCancelled
                    ? "Interview cancelled. Your application has been withdrawn."
                    : "This interview window has expired. You can still view your submitted transcript below."}
              </AlertDescription>
            </Alert>
          ) : null}

          <Card className="flex min-h-0 flex-1 flex-col rounded-xl border-zinc-800 bg-black">
            <CardContent className="flex min-h-0 flex-1 flex-col p-3 md:p-4">
              <InterviewTranscript
                messages={messages}
                className="min-h-0 flex-1 rounded-xl border-zinc-800 bg-black"
              />

              {isInProgress ? (
                <div className="mt-3 shrink-0">
                  <InterviewComposer
                    onSend={onSendMessage}
                    isSending={messageMutation.isPending}
                    disabled={isTerminal}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
