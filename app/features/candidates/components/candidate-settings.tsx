import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { UnsavedChangesBar } from "@/components/unsaved-changes-bar";
import { DeleteAccountSection } from "@/features/auth/components/delete-account-section";
import { updateUserName } from "@/features/auth/server/functions";
import { ResumeUploadField } from "@/features/candidates/components/resume-upload-field";
import {
  type getMyCandidateProfile,
  updateMyCandidateProfile,
} from "@/features/candidates/server/functions";
import type { User } from "@/router";
import { formatDateTime } from "@/shared/date";

type CandidateProfile = NonNullable<Awaited<ReturnType<typeof getMyCandidateProfile>>>;

const urlOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((val) => !val || z.url().safeParse(val).success, {
    message: "Must be a valid URL",
  });

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  headline: z.string().trim().min(1, "Headline is required").max(200),
  resumeKey: z.string(),
  linkedinUrl: urlOrEmpty,
  githubUrl: urlOrEmpty,
  portfolioUrl: urlOrEmpty,
  skills: z.array(z.string().trim().min(1)),
});

type FormValues = z.infer<typeof formSchema>;

export function CandidateSettings({ profile, user }: { profile: CandidateProfile; user: User }) {
  const router = useRouter();
  const id = useId();

  const updateProfileFn = useServerFn(updateMyCandidateProfile);
  const updateProfileMutation = useMutation({
    mutationFn: updateProfileFn,
    onSuccess: async () => {
      await router.invalidate();
      form.reset();
    },
    onError: () => {
      toast.error("Failed to save changes.");
    },
  });

  const updateNameFn = useServerFn(updateUserName);
  const updateNameMutation = useMutation({
    mutationFn: updateNameFn,
  });

  const links =
    profile.links && typeof profile.links === "object" && !Array.isArray(profile.links)
      ? profile.links
      : { linkedin: "", github: "", portfolio: "" };

  const form = useForm({
    defaultValues: {
      name: user.name ?? "",
      headline: profile.headline ?? "",
      resumeKey: profile.resumeKey ?? "",
      linkedinUrl: links.linkedin ?? "",
      githubUrl: links.github ?? "",
      portfolioUrl: links.portfolio ?? "",
      skills: Array.isArray(profile.skills) ? profile.skills : [],
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
          headline: value.headline || null,
          resumeKey: value.resumeKey || null,
          skills: value.skills.length > 0 ? value.skills : null,
          links:
            value.linkedinUrl || value.githubUrl || value.portfolioUrl
              ? {
                  linkedin: value.linkedinUrl || undefined,
                  github: value.githubUrl || undefined,
                  portfolio: value.portfolioUrl || undefined,
                }
              : null,
        },
      });
    },
  });

  const [skillInput, setSkillInput] = useState("");
  const resumeDetails = profile.resumeUpdatedAt
    ? `Resume last updated ${formatDateTime(profile.resumeUpdatedAt)}`
    : null;

  const skillInputId = `skill-input-${id}`;
  const onSave = () => {
    form.handleSubmit();
  };
  const onDiscard = () => {
    form.reset();
  };
  const onSkillInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSkillInput(e.target.value);
  };

  return (
    <div className="animate-fade-in space-y-6 pb-28">
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
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your candidate profile. This information is visible to companies when you apply.
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Your name, headline, and resume.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <form.Field
              name="headline"
              validators={{
                onBlur: z.string().trim().min(1, "Headline is required").max(200),
              }}
            >
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Headline</FieldLabel>
                    <Input
                      id={field.name}
                      placeholder="Senior Frontend Engineer"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    <p className="text-muted-foreground text-xs">
                      A short professional title that describes what you do
                    </p>
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
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
            <CardDescription>
              Technologies and skills you're proficient in. Helps match you with relevant jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form.Field name="skills" mode="array">
              {(skillsField) => {
                const onSkillInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                  const trimmed = skillInput.trim();
                  if (!trimmed) {
                    return;
                  }

                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();

                    if (!skillsField.state.value.includes(trimmed)) {
                      skillsField.pushValue(trimmed);
                    }

                    setSkillInput("");
                  }
                };
                const onRemoveSkill = (index: number) => {
                  skillsField.removeValue(index);
                };

                return (
                  <>
                    <Field>
                      <FieldLabel htmlFor={skillInputId}>Add skills</FieldLabel>
                      <Input
                        id={skillInputId}
                        placeholder="Type and press Enter (e.g. TypeScript, React)"
                        value={skillInput}
                        onChange={onSkillInputChange}
                        onKeyDown={onSkillInputKeyDown}
                      />
                    </Field>

                    {skillsField.state.value.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {skillsField.state.value.map((skill, index) => {
                          const onRemoveSkillClick = () => onRemoveSkill(index);
                          return (
                            <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                              {skill}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={onRemoveSkillClick}
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

        {/* Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links</CardTitle>
            <CardDescription>
              Help companies find your work and connect with you online.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form.Field name="linkedinUrl" validators={{ onBlur: urlOrEmpty }}>
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>LinkedIn</FieldLabel>
                    <Input
                      id={field.name}
                      placeholder="https://linkedin.com/in/yourprofile"
                      type="url"
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
            <form.Field name="githubUrl" validators={{ onBlur: urlOrEmpty }}>
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>GitHub</FieldLabel>
                    <Input
                      id={field.name}
                      placeholder="https://github.com/yourusername"
                      type="url"
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
            <form.Field name="portfolioUrl" validators={{ onBlur: urlOrEmpty }}>
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Portfolio</FieldLabel>
                    <Input
                      id={field.name}
                      placeholder="https://yourportfolio.com"
                      type="url"
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
          </CardContent>
        </Card>

        <DeleteAccountSection />
      </div>
    </div>
  );
}
