import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createCompany, getMyCompany } from "@/features/companies/server/functions";
import { useAppForm } from "@/shared/form";

export const Route = createFileRoute("/_authenticated/onboarding/company")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getMyCompany(),
  component: CompanyOnboardingPage,
});

function CompanyOnboardingPage() {
  const existingCompany = Route.useLoaderData();
  const router = useRouter();

  const createCompanyFn = useServerFn(createCompany);
  const createCompanyMutation = useMutation({
    mutationFn: createCompanyFn,
    onSuccess: async () => {
      await router.invalidate();
      await router.navigate({ to: "/dashboard" });
    },
    onError: () => {
      toast.error("Failed to create company. Please try again.");
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: "",
      description: "",
    },
    onSubmit: async ({ value }) => {
      if (!value.name.trim()) {
        toast.error("Company name is required");
        return;
      }

      await createCompanyMutation.mutateAsync({
        data: {
          name: value.name.trim(),
          description: value.description.trim() || undefined,
        },
      });
    },
  });

  if (existingCompany) {
    router.navigate({ to: "/dashboard" });
    return null;
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)/5%,transparent_70%)]" />

      <div className="animate-fade-in-up relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <span className="text-lg font-bold text-primary-foreground">H</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create your company</CardTitle>
            <CardDescription>
              Set up your company profile to start posting jobs and reviewing candidates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              <form.AppField
                name="name"
                children={(field) => (
                  <field.TextField
                    label="Company name"
                    placeholder="Acme Inc."
                    required
                    maxLength={100}
                  />
                )}
              />
              <form.AppField
                name="description"
                children={(field) => (
                  <field.TextareaField
                    label="Description"
                    placeholder="What does your company do?"
                    maxLength={500}
                    rows={3}
                  />
                )}
              />
              <form.AppForm>
                <form.SubmitButton label="Create company" submittingLabel="Creating..." />
              </form.AppForm>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
