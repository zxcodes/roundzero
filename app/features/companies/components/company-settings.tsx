import { Cancel01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateCompanyProfile } from "@/features/companies/server/functions";
import { type CompanySize, companySizeLabels, type Industry, industryLabels } from "@/shared/enums";
import { useAppForm } from "@/shared/form";

type Company = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  foundedYear: number | null;
  location: string | null;
  techStack: string[];
  culture: string | null;
  socialLinks: { linkedin?: string; twitter?: string; github?: string } | null;
};

const industryOptions = Object.entries(industryLabels).map(([value, label]) => ({ value, label }));
const sizeOptions = Object.entries(companySizeLabels).map(([value, label]) => ({ value, label }));

export function CompanySettings({ company }: { company: Company }) {
  const router = useRouter();
  const id = useId();

  const updateFn = useServerFn(updateCompanyProfile);
  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: async () => {
      toast.success("Company profile updated");
      await router.invalidate();
    },
    onError: () => {
      toast.error("Failed to update profile. Please try again.");
    },
  });

  const techStack = Array.isArray(company.techStack) ? company.techStack : [];
  const socialLinks =
    company.socialLinks && typeof company.socialLinks === "object"
      ? company.socialLinks
      : { linkedin: "", twitter: "", github: "" };

  const form = useAppForm({
    defaultValues: {
      name: company.name,
      description: company.description ?? "",
      website: company.website ?? "",
      industry: company.industry ?? "",
      companySize: company.companySize ?? "",
      foundedYear: company.foundedYear,
      location: company.location ?? "",
      culture: company.culture ?? "",
      linkedinUrl: socialLinks.linkedin ?? "",
      twitterUrl: socialLinks.twitter ?? "",
      githubUrl: socialLinks.github ?? "",
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        data: {
          name: value.name.trim(),
          description: value.description.trim() || null,
          logoUrl: company.logoUrl,
          website: value.website.trim() || null,
          industry: (value.industry || null) as Industry | null,
          companySize: (value.companySize || null) as CompanySize | null,
          foundedYear: value.foundedYear,
          location: value.location.trim() || null,
          techStack: tags.length > 0 ? tags : null,
          culture: value.culture.trim() || null,
          socialLinks:
            value.linkedinUrl || value.twitterUrl || value.githubUrl
              ? {
                  linkedin: value.linkedinUrl.trim() || undefined,
                  twitter: value.twitterUrl.trim() || undefined,
                  github: value.githubUrl.trim() || undefined,
                }
              : null,
        },
      });
    },
  });

  const [tags, setTags] = useState<string[]>(techStack);
  const [tagInput, setTagInput] = useState("");

  const tagInputId = `tag-input-${id}`;
  const logoId = `logo-${id}`;

  const onAddTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const onRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Company Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your company profile. This information is visible on your public company page.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Your company name, logo, and description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-5">
              {/* Logo placeholder */}
              <div className="space-y-1.5">
                <Label htmlFor={logoId}>Logo</Label>
                <button
                  type="button"
                  id={logoId}
                  className="flex size-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
                  onClick={() => toast.info("Logo upload will be available soon")}
                >
                  <HugeiconsIcon
                    icon={Upload04Icon}
                    strokeWidth={1.5}
                    className="size-5 text-muted-foreground/50"
                  />
                </button>
              </div>

              <div className="flex-1 space-y-4">
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
                  <Label>Slug</Label>
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
              </div>
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
            <div className="space-y-2">
              <Label htmlFor={tagInputId}>Add technologies</Label>
              <Input
                id={tagInputId}
                placeholder="Type and press Enter (e.g. TypeScript, React)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddTag(tagInput);
                  }
                  if (e.key === "," && tagInput.trim()) {
                    e.preventDefault();
                    onAddTag(tagInput);
                  }
                }}
              />
            </div>

            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onRemoveTag(tag)}
                      className="ml-0.5 size-4 hover:bg-muted-foreground/20"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            ) : null}
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

        <Separator />

        <form.AppForm>
          <form.SubmitButton label="Save changes" submittingLabel="Saving..." />
        </form.AppForm>
      </form>
    </div>
  );
}
