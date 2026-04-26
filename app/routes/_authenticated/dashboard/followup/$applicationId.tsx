import { ArrowLeft01Icon, ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardApplicationDetailSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getMyFollowup, submitMyFollowupAnswers } from "@/features/followups/server/functions";
import type { FollowupQuestion } from "@/features/followups/types";
import { validateUuidParams } from "@/shared/validation";

type Followup = NonNullable<Awaited<ReturnType<typeof getMyFollowup>>>;

function defaultAnswerMap(questions: FollowupQuestion[], answers: Followup["answers"]) {
  const map = Object.fromEntries(questions.map((question) => [question.id, ""])) as Record<
    string,
    string
  >;

  for (const answer of answers) {
    map[answer.questionId] = answer.value;
  }

  return map;
}

function formatDueAt(value: Date | string) {
  const date = new Date(value);

  try {
    return date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZoneName: "short",
    });
  } catch {
    return date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
}

function progressPercent(currentIndex: number, total: number) {
  if (total <= 1) {
    return 100;
  }

  return Math.round(((currentIndex + 1) / total) * 100);
}

function isSingleChoice(question: FollowupQuestion) {
  return (
    question.type === "single_choice" &&
    Array.isArray(question.options) &&
    question.options.length > 0
  );
}

export const Route = createFileRoute("/_authenticated/dashboard/followup/$applicationId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }

    validateUuidParams({ applicationId: params.applicationId });
  },
  loader: async ({ params }) => {
    const followup = await getMyFollowup({
      data: { applicationId: params.applicationId },
    });

    if (!followup) {
      throw notFound();
    }

    return { followup };
  },
  pendingComponent: DashboardApplicationDetailSkeleton,
  component: FollowupQuestionnairePage,
});

function FollowupQuestionnairePage() {
  const { followup } = Route.useLoaderData();
  const router = useRouter();
  const submitAnswersFn = useServerFn(submitMyFollowupAnswers);
  const [currentIndex, setCurrentIndex] = useState(0);

  const questions = followup.questions;
  const currentQuestion = questions[currentIndex];

  const initialAnswers = useMemo(
    () => defaultAnswerMap(questions, followup.answers),
    [followup.answers, questions],
  );

  const submitMutation = useMutation({
    mutationFn: submitAnswersFn,
    onSuccess: async () => {
      toast.success("Follow-up answers submitted.");
      await router.navigate({
        to: "/dashboard/application/$applicationId",
        params: { applicationId: followup.applicationId },
      });
    },
    onError: (error) => {
      toast.error(error.message || "Could not submit answers. Please try again.");
    },
  });

  const form = useForm({
    defaultValues: {
      answers: initialAnswers,
    },
    onSubmit: async ({ value }) => {
      const answers = questions.map((question) => ({
        questionId: question.id,
        value: value.answers[question.id] ?? "",
      }));

      await submitMutation.mutateAsync({
        data: {
          applicationId: followup.applicationId,
          answers,
        },
      });
    },
  });

  if (questions.length === 0) {
    return (
      <div className="animate-fade-in space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link
            to="/dashboard/application/$applicationId"
            params={{ applicationId: followup.applicationId }}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Application
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>No follow-up questions found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We could not load your questionnaire. Try again in a moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onPrevious = () => {
    if (currentIndex === 0) {
      return;
    }

    setCurrentIndex(currentIndex - 1);
  };

  const onNext = () => {
    if (currentIndex >= questions.length - 1) {
      return;
    }

    setCurrentIndex(currentIndex + 1);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (currentIndex < questions.length - 1) {
      onNext();
      return;
    }

    form.handleSubmit();
  };

  const percent = progressPercent(currentIndex, questions.length);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link
            to="/dashboard/application/$applicationId"
            params={{ applicationId: followup.applicationId }}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Application
          </Link>
        </Button>
        <Badge variant="outline" className="font-mono text-[11px]">
          Due {formatDueAt(followup.dueAt)}
        </Badge>
      </div>

      <Card className="overflow-hidden border border-primary/20">
        <div className="h-1.5 w-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <CardHeader className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
            Follow-up questionnaire
          </p>
          <CardTitle className="text-xl">{followup.jobTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Help us verify your fit with {followup.companyName}. Question {currentIndex + 1} of{" "}
            {questions.length}.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
              <p className="text-base font-semibold leading-relaxed">{currentQuestion.prompt}</p>
              {currentQuestion.helpText ? (
                <p className="text-sm text-muted-foreground">{currentQuestion.helpText}</p>
              ) : null}

              <form.Field name={`answers.${currentQuestion.id}`}>
                {(field) => {
                  const onTextValueChange = (event: ChangeEvent<HTMLInputElement>) => {
                    field.handleChange(event.target.value);
                  };

                  const onTextareaValueChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
                    field.handleChange(event.target.value);
                  };

                  if (isSingleChoice(currentQuestion)) {
                    const options = currentQuestion.options ?? [];
                    return (
                      <div className="space-y-2">
                        {options.map((option) => {
                          const selected = field.state.value === option;
                          const onOptionSelect = () => {
                            field.handleChange(option);
                          };

                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={onOptionSelect}
                              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted"}`}
                            >
                              <span className="flex items-center justify-between gap-3">
                                <span>{option}</span>
                                {selected ? (
                                  <HugeiconsIcon
                                    icon={Tick02Icon}
                                    strokeWidth={2}
                                    className="size-4"
                                  />
                                ) : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  if (currentQuestion.type === "short_text") {
                    return (
                      <Input
                        value={field.state.value}
                        onChange={onTextValueChange}
                        placeholder={currentQuestion.placeholder ?? "Type your answer"}
                        maxLength={currentQuestion.maxLength}
                      />
                    );
                  }

                  return (
                    <Textarea
                      rows={6}
                      value={field.state.value}
                      onChange={onTextareaValueChange}
                      placeholder={currentQuestion.placeholder ?? "Type your answer"}
                      maxLength={currentQuestion.maxLength}
                    />
                  );
                }}
              </form.Field>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onPrevious}
                disabled={currentIndex === 0 || submitMutation.isPending}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                Previous
              </Button>

              {currentIndex < questions.length - 1 ? (
                <Button type="button" onClick={onNext} disabled={submitMutation.isPending}>
                  Next
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? "Submitting..." : "Submit answers"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
