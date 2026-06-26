import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { UnsavedChangesBar } from "@/components/unsaved-changes-bar";
import { DeleteAccountSection } from "@/features/auth/components/delete-account-section";
import { currentUserQueryKey, updateUserName } from "@/features/auth/server/functions";
import { ResumeUploadField } from "@/features/candidates/components/resume-upload-field";
import {
  type getMyCandidateProfile,
  updateMyCandidateProfile,
} from "@/features/candidates/server/functions";
import type { User } from "@/router";
import { formatDateTime } from "@/shared/date";

type CandidateProfile = NonNullable<Awaited<ReturnType<typeof getMyCandidateProfile>>>;

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  resumeKey: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function CandidateSettings({ profile, user }: { profile: CandidateProfile; user: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const updateProfileFn = useServerFn(updateMyCandidateProfile);
  const updateProfileMutation = useMutation({
    mutationFn: updateProfileFn,
    onSuccess: async () => {
      await router.invalidate();
      form.reset(form.state.values);
    },
    onError: () => {
      toast.error("Failed to save changes.");
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
      name: user.name ?? "",
      resumeKey: profile.resumeKey ?? "",
    } as FormValues,

    validators: {
      onSubmit: formSchema,
    },

    onSubmit: async ({ value }) => {
      if (value.name && value.name !== user.name) {
        await updateNameMutation.mutateAsync({
          data: { name: value.name },
        });
      }

      await updateProfileMutation.mutateAsync({
        data: {
          resumeKey: value.resumeKey || null,
        },
      });
    },
  });

  const resumeDetails = profile.resumeUpdatedAt
    ? `Resume last updated ${formatDateTime(profile.resumeUpdatedAt)}`
    : null;

  const onSave = () => {
    form.handleSubmit();
  };
  const onDiscard = () => {
    form.reset();
  };

  return (
    <div className="space-y-6 pb-28">
      <form.Subscribe
        selector={(state) => ({ isDirty: state.isDirty, isSubmitting: state.isSubmitting })}
      >
        {({ isDirty, isSubmitting }) => (
          <UnsavedChangesBar
            isDirty={isDirty}
            isSubmitting={isSubmitting}
            onDiscard={onDiscard}
            onSave={onSave}
          />
        )}
      </form.Subscribe>

      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Profile settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your name and resume. This information is used when you apply to jobs.
        </p>
      </section>

      <div className="space-y-4">
        <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Basic information</h2>
            <p className="text-sm text-muted-foreground">Your name and resume.</p>
          </div>
          <div className="space-y-4">
            <form.Field
              name="name"
              validators={{
                onBlur: z.string().trim().min(1, "Name is required").max(100),
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
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="resumeKey">
              {(field) => (
                <ResumeUploadField
                  value={field.state.value}
                  details={resumeDetails}
                  showViewButton
                  description="Upload a PDF, DOC, or DOCX file. This is the resume attached when you apply."
                  onUploaded={async (resume) => {
                    field.handleChange(resume.resumeKey);
                  }}
                />
              )}
            </form.Field>
          </div>
        </section>

        <DeleteAccountSection />
      </div>
    </div>
  );
}
