import { Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { updateUserName } from "@/features/auth/server/functions";
import {
  createCandidateProfile,
  createResumeUploadTarget,
  finalizeResumeUpload,
  getMyCandidateProfile,
} from "@/features/candidates/server/functions";
import { useAppForm } from "@/shared/form";

export const Route = createFileRoute("/_authenticated/onboarding/candidate")({
  beforeLoad: ({ context }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getMyCandidateProfile(),
  component: CandidateOnboardingPage,
});

function CandidateOnboardingPage() {
  const existingProfile = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const id = useId();
  const [uploadedResume, setUploadedResume] = useState<{
    fileName: string;
    resumeKey: string;
  } | null>(null);

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
  const createUploadTargetFn = useServerFn(createResumeUploadTarget);
  const finalizeResumeUploadFn = useServerFn(finalizeResumeUpload);
  const resumeInputId = `resume-${id}`;

  const form = useAppForm({
    defaultValues: {
      name: user?.name ?? "",
      headline: "",
    },
    onSubmit: async ({ value }) => {
      if (!uploadedResume?.resumeKey) {
        throw new Error("Upload your resume before creating your profile");
      }

      const trimmedName = value.name.trim();
      if (trimmedName && trimmedName !== user?.name) {
        await updateNameMutation.mutateAsync({
          data: { name: trimmedName },
        });
      }

      await createProfileMutation.mutateAsync({
        data: {
          headline: value.headline.trim() || undefined,
          resumeKey: uploadedResume.resumeKey,
        },
      });
    },
  });

  const onResumeSelected = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const target = await createUploadTargetFn({
        data: {
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type as
            | "application/pdf"
            | "application/msword"
            | "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      });

      if (target.uploadUrl) {
        const response = await fetch(target.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }
      }

      const finalized = await finalizeResumeUploadFn({
        data: { resumeKey: target.resumeKey },
      });

      setUploadedResume({
        fileName: file.name,
        resumeKey: finalized.resumeKey,
      });
      toast.success("Resume uploaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload resume";
      toast.error(message);
    }
  };

  if (existingProfile) {
    router.navigate({ to: "/dashboard" });
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Complete your profile</CardTitle>
        <CardDescription>
          Set up your candidate profile to start applying for jobs. You can add more details later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-5"
        >
          <form.AppField
            name="name"
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
            children={(field) => (
              <field.TextField
                label="Headline"
                placeholder="Senior Frontend Engineer"
                maxLength={200}
                description="A short professional title that describes what you do"
              />
            )}
          />

          <div className="space-y-2">
            <Label htmlFor={resumeInputId}>Resume</Label>
            <input
              id={resumeInputId}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => onResumeSelected(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor={resumeInputId}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-background shadow-xs">
                  <HugeiconsIcon
                    icon={Upload04Icon}
                    strokeWidth={2}
                    className="size-4 text-primary"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {uploadedResume ? "Replace resume" : "Choose resume file"}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX</p>
                </div>
              </div>
              <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium">
                Browse
              </span>
            </label>
            <p className="text-muted-foreground text-xs">
              Upload a PDF, DOC, or DOCX resume. This is required to apply.
            </p>
            {uploadedResume ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <HugeiconsIcon
                    icon={Upload04Icon}
                    strokeWidth={2}
                    className="size-4 text-emerald-500"
                  />
                  <span>{uploadedResume.fileName}</span>
                </div>
                <span className="text-xs font-medium text-emerald-600">Uploaded</span>
              </div>
            ) : null}
          </div>

          <form.AppForm>
            <form.SubmitButton label="Create profile" submittingLabel="Creating..." />
          </form.AppForm>
        </form>
      </CardContent>
    </Card>
  );
}
