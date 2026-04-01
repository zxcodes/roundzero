import { useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateUserName } from "@/features/auth/server/functions";
import { ResumeUploadField } from "@/features/candidates/components/resume-upload-field";
import {
  createCandidateProfile,
  getMyCandidateProfile,
} from "@/features/candidates/server/functions";
import { useAppForm } from "@/shared/form";
import { clearPendingResume, getPendingResumeStorageKey, readPendingResume } from "@/shared/resume";

export const Route = createFileRoute("/_authenticated/onboarding/candidate")({
  beforeLoad: ({ context }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async () => {
    const profile = await getMyCandidateProfile();
    if (profile) {
      throw redirect({ to: "/dashboard" });
    }
    return null;
  },
  component: CandidateOnboardingPage,
});

function CandidateOnboardingPage() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const pendingResumeStorageKey = getPendingResumeStorageKey(user?.id ?? "candidate");
  const pendingResume = readPendingResume(pendingResumeStorageKey);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const onboardingSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    headline: z.string().trim().min(1, "Headline is required"),
    resumeKey: z.string().min(1, "Resume is required"),
  });

  const createProfileFn = useServerFn(createCandidateProfile);
  const createProfileMutation = useMutation({
    mutationFn: createProfileFn,
    onSuccess: async () => {
      await router.invalidate();
      await router.navigate({ to: "/dashboard" });
    },
    onError: () => {
      toast.error("Failed to create profile. Please try again.");
    },
  });

  const updateNameFn = useServerFn(updateUserName);
  const updateNameMutation = useMutation({
    mutationFn: updateNameFn,
  });

  const form = useAppForm({
    defaultValues: {
      name: user?.name ?? "",
      headline: "",
      resumeKey: pendingResume?.resumeKey ?? "",
    },
    onSubmit: async ({ value }) => {
      setResumeError(null);
      if (!value.resumeKey) {
        setResumeError("Resume is required");
        toast.error("Upload your resume before creating your profile.");
        return;
      }

      if (value.name && value.name !== user?.name) {
        await updateNameMutation.mutateAsync({
          data: { name: value.name },
        });
      }

      await createProfileMutation.mutateAsync({
        data: {
          headline: value.headline || undefined,
          resumeKey: value.resumeKey,
        },
      });

      clearPendingResume(pendingResumeStorageKey);
    },
    onSubmitInvalid: () => {
      const firstError = [
        form.getFieldInfo("name").instance?.state.meta.errors[0],
        form.getFieldInfo("headline").instance?.state.meta.errors[0],
        form.getFieldValue("resumeKey") ? null : "Resume is required",
      ].find(Boolean);

      if (!form.getFieldValue("resumeKey")) {
        setResumeError("Resume is required");
      }

      if (typeof firstError === "string") {
        toast.error(firstError);
      } else {
        toast.error("Complete all required fields before creating your profile.");
      }
    },
  });
  const currentResumeKey = useStore(form.store, (state) => state.values.resumeKey);
  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.handleSubmit();
  };
  const onResumeUploaded = (resume: { resumeKey: string }) => {
    form.setFieldValue("resumeKey", resume.resumeKey);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Complete your profile</CardTitle>
        <CardDescription>
          Set up your candidate profile to start applying for jobs. You can add more details later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onFormSubmit} className="space-y-5">
          <form.AppField
            name="name"
            validators={{
              onBlur: z.string().trim().min(1, "Name is required"),
              onSubmit: onboardingSchema.shape.name,
            }}
            children={(field) => (
              <field.TextField
                label="Name"
                placeholder="Your full name"
                maxLength={100}
                description="You can update this anytime"
              />
            )}
          />

          <form.AppField
            name="headline"
            validators={{
              onBlur: z.string().trim().min(1, "Headline is required"),
              onSubmit: onboardingSchema.shape.headline,
            }}
            children={(field) => (
              <field.TextField
                label="Headline"
                placeholder="Senior Frontend Engineer"
                maxLength={200}
                description="A short professional title that describes what you do"
              />
            )}
          />

          <ResumeUploadField
            value={currentResumeKey}
            storageKey={pendingResumeStorageKey}
            error={resumeError}
            onErrorChange={setResumeError}
            description="Upload a PDF, DOC, or DOCX resume. This is required to apply."
            onUploaded={onResumeUploaded}
          />

          <form.AppForm>
            <form.SubmitButton label="Create profile" submittingLabel="Creating..." />
          </form.AppForm>
        </form>
      </CardContent>
    </Card>
  );
}
