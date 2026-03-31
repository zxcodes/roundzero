import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateUserName } from "@/features/auth/server/functions";
import {
  createCandidateProfile,
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
      resumeUrl: "",
    },
    onSubmit: async ({ value }) => {
      const trimmedName = value.name.trim();
      if (trimmedName && trimmedName !== user?.name) {
        await updateNameMutation.mutateAsync({
          data: { name: trimmedName },
        });
      }

      await createProfileMutation.mutateAsync({
        data: {
          headline: value.headline.trim() || undefined,
          resumeUrl: value.resumeUrl.trim(),
        },
      });
    },
  });

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

          <form.AppField
            name="resumeUrl"
            children={(field) => (
              <field.TextField
                label="Resume URL"
                placeholder="https://example.com/resume.pdf"
                type="url"
                description="Required to apply. Use a shareable link to your current resume."
              />
            )}
          />

          <form.AppForm>
            <form.SubmitButton label="Create profile" submittingLabel="Creating..." />
          </form.AppForm>
        </form>
      </CardContent>
    </Card>
  );
}
