import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createCompany } from "@/features/companies/server/functions";
import { type CompanySize, companySizeLabels, type Industry, industryLabels } from "@/shared/enums";
import { useAppForm } from "@/shared/form";

const onboardingSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/onboarding/company")({
  validateSearch: onboardingSearchSchema,
  component: CompanyOnboardingPage,
});

const industryOptions = Object.entries(industryLabels).map(([value, label]) => ({ value, label }));
const sizeOptions = Object.entries(companySizeLabels).map(([value, label]) => ({ value, label }));

function CompanyOnboardingPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const router = useRouter();
  const onboardingSchema = z.object({
    name: z.string().trim().min(1, "Company name is required"),
    industry: z.string(),
    companySize: z.string(),
    description: z.string(),
  });

  const createCompanyFn = useServerFn(createCompany);
  const createCompanyMutation = useMutation({
    mutationFn: createCompanyFn,
    onSuccess: async () => {
      await router.invalidate();
      await router.navigate({ to: redirectTo ?? "/dashboard" });
    },
    onError: () => {
      toast.error("Failed to create company. Please try again.");
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: "",
      industry: "",
      companySize: "",
      description: "",
    },
    onSubmit: async ({ value }) => {
      await createCompanyMutation.mutateAsync({
        data: {
          name: value.name,
          description: value.description || undefined,
          industry: (value.industry || undefined) as Industry | undefined,
          companySize: (value.companySize || undefined) as CompanySize | undefined,
        },
      });
    },
    onSubmitInvalid: () => {
      const firstError = form.getFieldInfo("name").instance?.state.meta.errors[0];

      if (typeof firstError === "string") {
        toast.error(firstError);
      } else {
        toast.error("Complete all required fields before creating your company.");
      }
    },
  });

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.handleSubmit();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Set up your company</CardTitle>
        <CardDescription>
          Tell us a bit about your company. You can complete your full profile later in settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onFormSubmit} className="space-y-5">
          <form.AppField
            name="name"
            validators={{
              onBlur: z.string().trim().min(1, "Company name is required"),
              onSubmit: onboardingSchema.shape.name,
            }}
            children={(field) => (
              <field.TextField
                label="Company name"
                placeholder="Acme Inc."
                required
                maxLength={100}
              />
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <form.AppField
              name="industry"
              children={(field) => (
                <field.SelectField
                  label="Industry"
                  placeholder="Select industry"
                  options={industryOptions}
                />
              )}
            />
            <form.AppField
              name="companySize"
              children={(field) => (
                <field.SelectField
                  label="Company size"
                  placeholder="Select size"
                  options={sizeOptions}
                />
              )}
            />
          </div>

          <form.AppField
            name="description"
            children={(field) => (
              <field.TextareaField
                label="Short description"
                placeholder="What does your company do? One or two sentences is great."
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
  );
}
