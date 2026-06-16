import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { currentUserQueryKey, updateUserName } from "@/features/auth/server/functions";
import { ResumeUploadField } from "@/features/candidates/components/resume-upload-field";
import { createCandidateProfile } from "@/features/candidates/server/functions";

const onboardingSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/onboarding/candidate")({
  validateSearch: onboardingSearchSchema,
  component: CandidateOnboardingPage,
});

function CandidateOnboardingPage() {
  const { user } = Route.useRouteContext();
  const { redirect: redirectTo } = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();

  const onboardingSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    resumeKey: z.string(),
  });

  const createProfileFn = useServerFn(createCandidateProfile);
  const createProfileMutation = useMutation({
    mutationFn: createProfileFn,
    onSuccess: async () => {
      await router.invalidate();
      await router.navigate({ to: redirectTo ?? "/dashboard" });
    },
    onError: () => {
      toast.error("Failed to create profile. Please try again.");
    },
  });

  const updateNameFn = useServerFn(updateUserName);
  const updateNameMutation = useMutation({
    mutationFn: updateNameFn,
    onSuccess: (data) => {
      queryClient.setQueryData(currentUserQueryKey, data.user);
    },
  });

  const form = useForm({
    defaultValues: {
      name: user?.name ?? "",
      resumeKey: "",
    },
    validators: {
      onSubmit: onboardingSchema,
    },
    onSubmit: async ({ value }) => {
      if (value.name && value.name !== user?.name) {
        await updateNameMutation.mutateAsync({
          data: { name: value.name },
        });
      }

      await createProfileMutation.mutateAsync({
        data: {
          resumeKey: value.resumeKey || undefined,
        },
      });
    },
  });

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.handleSubmit();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Complete your profile</CardTitle>
        <CardDescription>Set up your candidate profile to start applying for jobs.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onFormSubmit} className="space-y-5">
          <form.Field
            name="name"
            validators={{
              onBlur: z.string().trim().min(1, "Name is required"),
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="Your full name"
                    maxLength={100}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  <p className="text-muted-foreground text-xs">You can update this anytime</p>
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="resumeKey">
            {(field) => (
              <ResumeUploadField
                value={field.state.value}
                description="Upload a PDF, DOC, or DOCX resume. You can also add this later in settings."
                onUploaded={async (resume) => {
                  field.handleChange(resume.resumeKey);
                }}
              />
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      strokeWidth={2}
                      className="size-4 animate-spin"
                    />
                    Creating...
                  </>
                ) : (
                  "Create profile"
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  );
}
