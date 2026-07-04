import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { redirectAfterSignup, signupSearchSchema } from "@/features/auth/signup-search";
import { companyBootstrapQueryKey, createCompany } from "@/features/companies/server/functions";
import {
  type CompanySize,
  companySizeLabels,
  type Industry,
  industryLabels,
  MAX_COMPANY_DESCRIPTION_LENGTH,
} from "@/shared/enums";

export const Route = createFileRoute("/_authenticated/onboarding/company")({
  validateSearch: signupSearchSchema,
  component: CompanyOnboardingPage,
});

const industryOptions = Object.entries(industryLabels).map(([value, label]) => ({ value, label }));
const sizeOptions = Object.entries(companySizeLabels).map(([value, label]) => ({ value, label }));

function CompanyOnboardingPage() {
  const router = useRouter();
  const signupSearch = Route.useSearch();
  const queryClient = useQueryClient();

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
      await queryClient.invalidateQueries({ queryKey: companyBootstrapQueryKey });
      await router.navigate({
        ...redirectAfterSignup(signupSearch),
        replace: true,
      });
    },
    onError: () => {
      toast.error("Failed to create company. Please try again.");
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      industry: "",
      companySize: "",
      description: "",
    },
    validators: {
      onSubmit: onboardingSchema,
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
  });

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.handleSubmit();
  };

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Set up your company</h1>
        <p className="text-sm text-muted-foreground">
          Tell us a bit about your company. You can complete your full profile later in settings.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
        <form onSubmit={onFormSubmit} className="space-y-5">
          <form.Field
            name="name"
            validators={{
              onBlur: z.string().trim().min(1, "Company name is required"),
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Company name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="Acme Inc."
                    required
                    maxLength={100}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="industry">
              {(field) => {
                return (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Industry</FieldLabel>
                    <Select value={field.state.value} onValueChange={field.handleChange}>
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industryOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="companySize">
              {(field) => {
                return (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Company size</FieldLabel>
                    <Select value={field.state.value} onValueChange={field.handleChange}>
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                );
              }}
            </form.Field>
          </div>

          <form.Field name="description">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Short description</FieldLabel>
                  <Textarea
                    id={field.name}
                    placeholder="What does your company do? One or two sentences is great."
                    maxLength={MAX_COMPANY_DESCRIPTION_LENGTH}
                    rows={3}
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
                  "Create company"
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </section>
    </div>
  );
}
