import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyLogoUploadField } from "@/features/companies/components/company-logo-upload-field";
import {
  type getMyCompany,
  updateCompanyProfile,
  updateMyCompanyLogo,
} from "@/features/companies/server/functions";
import { AutoSaveIndicator, useAutoSaveStatus } from "@/shared/auto-save-indicator";
import { type CompanySize, companySizeLabels, type Industry, industryLabels } from "@/shared/enums";
import { useAppForm } from "@/shared/form";

type Company = NonNullable<Awaited<ReturnType<typeof getMyCompany>>>;

const industryOptions = Object.entries(industryLabels).map(([value, label]) => ({ value, label }));
const sizeOptions = Object.entries(companySizeLabels).map(([value, label]) => ({ value, label }));

export function CompanySettings({ company }: { company: Company }) {
  const router = useRouter();
  const id = useId();

  const updateFn = useServerFn(updateCompanyProfile);
  const updateLogoFn = useServerFn(updateMyCompanyLogo);

  const autoSave = useAutoSaveStatus();

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onMutate: () => autoSave.setSaving(),
    onSuccess: async () => {
      autoSave.setSaved();
      await router.invalidate();
    },
    onError: () => {
      autoSave.setError();
    },
  });

  const updateLogoMutation = useMutation({
    mutationFn: updateLogoFn,
    onMutate: () => autoSave.setSaving(),
    onSuccess: async () => {
      autoSave.setSaved();
      await router.invalidate();
    },
    onError: () => {
      autoSave.setError();
    },
  });

  const socialLinks =
    company.socialLinks && typeof company.socialLinks === "object"
      ? company.socialLinks
      : { linkedin: "", twitter: "", github: "" };

  const form = useAppForm({
    defaultValues: {
      name: company.name,
      description: company.description ?? "",
      logoKey: company.logoKey ?? "",
      website: company.website ?? "",
      industry: company.industry ?? "",
      companySize: company.companySize ?? "",
      foundedYear: company.foundedYear,
      location: company.location ?? "",
      culture: company.culture ?? "",
      linkedinUrl: socialLinks.linkedin ?? "",
      twitterUrl: socialLinks.twitter ?? "",
      githubUrl: socialLinks.github ?? "",
      techStack: Array.isArray(company.techStack) ? company.techStack : [],
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        data: {
          name: value.name,
          description: value.description || null,
          logoKey: value.logoKey || null,
          website: value.website || null,
          industry: (value.industry || null) as Industry | null,
          companySize: (value.companySize || null) as CompanySize | null,
          foundedYear: value.foundedYear,
          location: value.location || null,
          techStack: value.techStack.length > 0 ? value.techStack : null,
          culture: value.culture || null,
          socialLinks:
            value.linkedinUrl || value.twitterUrl || value.githubUrl
              ? {
                  linkedin: value.linkedinUrl || undefined,
                  twitter: value.twitterUrl || undefined,
                  github: value.githubUrl || undefined,
                }
              : null,
        },
      });
    },
    listeners: {
      onChange: ({ formApi }) => {
        if (formApi.state.isDirty) {
          formApi.handleSubmit();
        }
      },
      onChangeDebounceMs: 1500,
    },
  });

  const [tagInput, setTagInput] = useState("");

  const tagInputId = `tag-input-${id}`;
  const currentLogoKey = useStore(form.store, (state) => state.values.logoKey);
  const onLogoUploaded = async ({ logoKey }: { logoKey: string }) => {
    form.setFieldValue("logoKey", logoKey);
    await updateLogoMutation.mutateAsync({
      data: { logoKey },
    });
  };
  const onTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Company Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your company profile. This information is visible on your public company page.
          </p>
        </div>
        <AutoSaveIndicator status={autoSave.status} />
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Your company name, logo, and description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CompanyLogoUploadField
              value={currentLogoKey}
              description="Upload a square or transparent company logo. This appears on your public company page."
              onUploaded={onLogoUploaded}
            />

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

            <div className="space-y-2">
              <Input value={company.slug} disabled className="bg-muted font-mono text-sm" />
              <p className="text-muted-foreground text-xs">
                Your public URL:{" "}
                <a
                  href={`${import.meta.env.VITE_APP_URL}/companies/${company.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  {import.meta.env.VITE_APP_URL}/companies/{company.slug}
                </a>
              </p>
            </div>

            <form.AppField
              name="description"
              children={(field) => (
                <field.TextareaField
                  label="Description"
                  placeholder="Tell candidates what your company does and what makes it a great place to work."
                  maxLength={2000}
                  rows={4}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Details</CardTitle>
            <CardDescription>Industry, size, location, and other details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField
                name="foundedYear"
                children={(field) => (
                  <field.NumberField label="Founded year" placeholder="2020" min={1800} />
                )}
              />
              <form.AppField
                name="location"
                children={(field) => (
                  <field.TextField
                    label="Location"
                    placeholder="San Francisco, CA"
                    maxLength={200}
                  />
                )}
              />
            </div>

            <form.AppField
              name="website"
              children={(field) => (
                <field.TextField label="Website" placeholder="https://yourcompany.com" type="url" />
              )}
            />
          </CardContent>
        </Card>

        {/* Tech Stack */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tech Stack</CardTitle>
            <CardDescription>
              Technologies your team works with. Helps candidates find you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form.Field name="techStack" mode="array">
              {(techStackField) => {
                const onTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                  const trimmed = tagInput.trim();
                  if (!trimmed) {
                    return;
                  }

                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();

                    if (!techStackField.state.value.includes(trimmed)) {
                      techStackField.pushValue(trimmed);
                      form.handleSubmit();
                    }

                    setTagInput("");
                  }
                };

                const onRemoveTag = (index: number) => {
                  techStackField.removeValue(index);
                  form.handleSubmit();
                };

                return (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={tagInputId}>Add technologies</Label>
                      <Input
                        id={tagInputId}
                        placeholder="Type and press Enter (e.g. TypeScript, React)"
                        value={tagInput}
                        onChange={onTagInputChange}
                        onKeyDown={onTagInputKeyDown}
                      />
                    </div>

                    {techStackField.state.value.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {techStackField.state.value.map((tag: string, index: number) => {
                          const onRemoveTagClick = () => {
                            onRemoveTag(index);
                          };

                          return (
                            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                              {tag}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={onRemoveTagClick}
                                className="ml-0.5 size-4 hover:bg-muted-foreground/20"
                              >
                                <HugeiconsIcon
                                  icon={Cancel01Icon}
                                  strokeWidth={2}
                                  className="size-3"
                                />
                              </Button>
                            </Badge>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                );
              }}
            </form.Field>
          </CardContent>
        </Card>

        {/* Culture */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Culture & Perks</CardTitle>
            <CardDescription>
              What's it like to work at your company? Values, perks, work style.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.AppField
              name="culture"
              children={(field) => (
                <field.TextareaField
                  label="Culture"
                  placeholder="Remote-first, async communication, quarterly offsites..."
                  maxLength={5000}
                  rows={5}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Social Links</CardTitle>
            <CardDescription>Help candidates connect with your company online.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form.AppField
              name="linkedinUrl"
              children={(field) => (
                <field.TextField
                  label="LinkedIn"
                  placeholder="https://linkedin.com/company/yourcompany"
                  type="url"
                />
              )}
            />
            <form.AppField
              name="twitterUrl"
              children={(field) => (
                <field.TextField
                  label="Twitter / X"
                  placeholder="https://twitter.com/yourcompany"
                  type="url"
                />
              )}
            />
            <form.AppField
              name="githubUrl"
              children={(field) => (
                <field.TextField
                  label="GitHub"
                  placeholder="https://github.com/yourcompany"
                  type="url"
                />
              )}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
