import { Cancel01Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { UnsavedChangesBar } from "@/components/unsaved-changes-bar";
import { DeleteAccountSection } from "@/features/auth/components/delete-account-section";
import { CompanyLogoUploadField } from "@/features/companies/components/company-logo-upload-field";
import { type getMyCompany, updateCompanyProfile } from "@/features/companies/server/functions";
import { type CompanySize, companySizeLabels, type Industry, industryLabels } from "@/shared/enums";

type Company = NonNullable<Awaited<ReturnType<typeof getMyCompany>>>;

const industryOptions = Object.entries(industryLabels).map(([value, label]) => ({ value, label }));
const sizeOptions = Object.entries(companySizeLabels).map(([value, label]) => ({ value, label }));

function publicCompanyUrl(slug: string) {
  return `${import.meta.env.VITE_APP_URL}/companies/${slug}`;
}

export function CompanySettings({
  company,
  canManageProfile = true,
}: {
  company: Company;
  canManageProfile?: boolean;
}) {
  const router = useRouter();
  const id = useId();

  const updateFn = useServerFn(updateCompanyProfile);

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: async () => {
      await router.invalidate();
      // Lock the just-submitted values in as the new baseline. Plain
      // `form.reset()` would revert to the stale defaults captured on mount
      // (TanStack Form ignores new defaultValues once `isTouched` is true —
      // see FormApi#update), which is why the logo appeared to "disappear"
      // until a manual refresh.
      form.reset(form.state.values);
    },
    onError: () => {
      toast.error("Failed to save changes.");
    },
  });

  const socialLinks =
    company.socialLinks && typeof company.socialLinks === "object"
      ? company.socialLinks
      : { linkedin: "", twitter: "", github: "" };

  const form = useForm({
    defaultValues: {
      name: company.name,
      description: company.description ?? "",
      logoKey: company.logoKey ?? "",
      website: company.website ?? "",
      industry: company.industry ?? "",
      companySize: company.companySize ?? "",
      foundedYear: company.foundedYear != null ? String(company.foundedYear) : "",
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
          foundedYear: value.foundedYear ? Number(value.foundedYear) : null,
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
  });

  const [tagInput, setTagInput] = useState("");

  const tagInputId = `tag-input-${id}`;
  const onTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };
  const onSave = () => {
    form.handleSubmit();
  };
  const onDiscard = () => {
    form.reset();
  };

  if (!canManageProfile) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Company profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your admin manages the public company profile. Contact them for changes.
          </p>
        </div>
        <section className="space-y-3 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">{company.name}</h2>
            {company.description ? (
              <p className="text-sm text-muted-foreground">{company.description}</p>
            ) : null}
          </div>
          <CompanyCareersLink slug={company.slug} />
          {company.website ? (
            <p className="text-sm text-muted-foreground">{company.website}</p>
          ) : null}
        </section>
        <DeleteAccountSection />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Company profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your company profile. This information is visible on your public company page.
        </p>
      </div>

      <div className="space-y-4">
        {/* Basic Info */}
        <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Basic information</h2>
            <p className="text-sm text-muted-foreground">
              Your company name, logo, and description.
            </p>
          </div>
          <div className="space-y-4">
            <form.Field name="logoKey">
              {(field) => (
                <CompanyLogoUploadField
                  value={field.state.value}
                  description="Upload a square or transparent company logo. This appears on your public company page."
                  onUploaded={async ({ logoKey }) => {
                    field.handleChange(logoKey);
                  }}
                />
              )}
            </form.Field>

            <form.Field name="name">
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

            <CompanyCareersLink slug={company.slug} />

            <form.Field name="description">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                    <Textarea
                      id={field.name}
                      placeholder="Tell candidates what your company does and what makes it a great place to work."
                      maxLength={2000}
                      rows={4}
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
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Company details</h2>
            <p className="text-sm text-muted-foreground">
              Industry, size, location, and other details.
            </p>
          </div>
          <div className="space-y-4">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="foundedYear">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Founded year</FieldLabel>
                      <Input
                        id={field.name}
                        inputMode="numeric"
                        placeholder="2020"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="location">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Location</FieldLabel>
                      <Input
                        id={field.name}
                        placeholder="San Francisco, CA"
                        maxLength={200}
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
            </div>

            <form.Field name="website">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Website</FieldLabel>
                    <Input
                      id={field.name}
                      type="url"
                      placeholder="https://yourcompany.com"
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
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Tech stack</h2>
            <p className="text-sm text-muted-foreground">
              Technologies your team works with. Helps candidates find you.
            </p>
          </div>
          <div className="space-y-3">
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
                    }

                    setTagInput("");
                  }
                };

                const onRemoveTag = (index: number) => {
                  techStackField.removeValue(index);
                };

                return (
                  <>
                    <Field>
                      <FieldLabel htmlFor={tagInputId}>Add technologies</FieldLabel>
                      <Input
                        id={tagInputId}
                        placeholder="Type and press Enter (e.g. TypeScript, React)"
                        value={tagInput}
                        onChange={onTagInputChange}
                        onKeyDown={onTagInputKeyDown}
                      />
                    </Field>

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
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Culture & perks</h2>
            <p className="text-sm text-muted-foreground">
              What&apos;s it like to work at your company? Values, perks, work style.
            </p>
          </div>
          <div>
            <form.Field name="culture">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Culture</FieldLabel>
                    <Textarea
                      id={field.name}
                      placeholder="Remote-first, async communication, quarterly offsites..."
                      maxLength={5000}
                      rows={5}
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
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Social links</h2>
            <p className="text-sm text-muted-foreground">
              Help candidates connect with your company online.
            </p>
          </div>
          <div className="space-y-4">
            <form.Field name="linkedinUrl">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>LinkedIn</FieldLabel>
                    <Input
                      id={field.name}
                      type="url"
                      placeholder="https://linkedin.com/company/yourcompany"
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

            <form.Field name="twitterUrl">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Twitter / X</FieldLabel>
                    <Input
                      id={field.name}
                      type="url"
                      placeholder="https://twitter.com/yourcompany"
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

            <form.Field name="githubUrl">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>GitHub</FieldLabel>
                    <Input
                      id={field.name}
                      type="url"
                      placeholder="https://github.com/yourcompany"
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
          </div>
        </section>

        <DeleteAccountSection />
      </div>
    </div>
  );
}

function CompanyCareersLink({ slug }: { slug: string }) {
  const careersUrl = publicCompanyUrl(slug);

  const onCopyCareersLink = async () => {
    try {
      await navigator.clipboard.writeText(careersUrl);
      toast.success("Careers page link copied");
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  return (
    <div className="space-y-2">
      <FieldLabel>Careers page link</FieldLabel>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={careersUrl} readOnly className="bg-muted text-sm" />
        <Button type="button" variant="outline" size="sm" onClick={onCopyCareersLink}>
          <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3.5" />
          Copy link
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={careersUrl} target="_blank" rel="noopener noreferrer">
            Open page
          </a>
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Share this on your website careers page so candidates can browse open roles.
      </p>
    </div>
  );
}
