import {
  Add01Icon,
  Cancel01Icon,
  Loading03Icon,
  Tick02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useStore } from "@tanstack/react-form";
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
import { updateUserName } from "@/features/auth/server/functions";
import {
  createResumeUploadTarget,
  finalizeResumeUpload,
  type getMyCandidateProfile,
  getResumeDownloadUrl,
  type UpdateCandidateProfileInput,
  updateMyCandidateProfile,
} from "@/features/candidates/server/functions";
import type { User } from "@/router";
import { AutoSaveIndicator, useAutoSaveStatus } from "@/shared/auto-save-indicator";
import { useAppForm } from "@/shared/form";

type CandidateProfile = NonNullable<Awaited<ReturnType<typeof getMyCandidateProfile>>>;
type WorkHistoryEntry = NonNullable<UpdateCandidateProfileInput["workHistory"]>[number];

export function CandidateSettings({ profile, user }: { profile: CandidateProfile; user: User }) {
  const router = useRouter();
  const id = useId();
  const [uploadedResumeName, setUploadedResumeName] = useState<string | null>(null);

  const autoSave = useAutoSaveStatus();

  const updateProfileFn = useServerFn(updateMyCandidateProfile);
  const updateProfileMutation = useMutation({
    mutationFn: updateProfileFn,
    onMutate: () => autoSave.setSaving(),
    onSuccess: async () => {
      autoSave.setSaved();
      await router.invalidate();
    },
    onError: () => {
      autoSave.setError();
    },
  });

  const updateNameFn = useServerFn(updateUserName);
  const updateNameMutation = useMutation({
    mutationFn: updateNameFn,
  });
  const createUploadTargetFn = useServerFn(createResumeUploadTarget);
  const finalizeResumeUploadFn = useServerFn(finalizeResumeUpload);
  const getResumeDownloadUrlFn = useServerFn(getResumeDownloadUrl);

  const links =
    profile.links && typeof profile.links === "object" && !Array.isArray(profile.links)
      ? profile.links
      : { linkedin: "", github: "", portfolio: "" };

  const form = useAppForm({
    defaultValues: {
      name: user.name ?? "",
      headline: profile.headline ?? "",
      resumeKey: profile.resumeKey ?? "",
      bio: profile.bio ?? "",
      linkedinUrl: links.linkedin ?? "",
      githubUrl: links.github ?? "",
      portfolioUrl: links.portfolio ?? "",
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      workHistory: Array.isArray(profile.workHistory) ? profile.workHistory : [],
    },
    onSubmit: async ({ value }) => {
      const trimmedName = value.name.trim();

      if (trimmedName && trimmedName !== user.name) {
        await updateNameMutation.mutateAsync({
          data: { name: trimmedName },
        });
      }

      await updateProfileMutation.mutateAsync({
        data: {
          headline: value.headline.trim() || null,
          resumeKey: value.resumeKey || null,
          bio: value.bio.trim() || null,
          skills: value.skills.length > 0 ? value.skills : null,
          workHistory: value.workHistory.length > 0 ? value.workHistory : null,
          links:
            value.linkedinUrl || value.githubUrl || value.portfolioUrl
              ? {
                  linkedin: value.linkedinUrl.trim() || undefined,
                  github: value.githubUrl.trim() || undefined,
                  portfolio: value.portfolioUrl.trim() || undefined,
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

  const [skillInput, setSkillInput] = useState("");
  const [entrySaveStatus, setEntrySaveStatus] = useState<Record<number, "saving" | "saved">>({});
  const currentSkillTags = useStore(form.store, (state) => state.values.skills);
  const currentWorkEntries = useStore(form.store, (state) => state.values.workHistory);

  const skillInputId = `skill-input-${id}`;
  const resumeInputId = `resume-${id}`;

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

      form.setFieldValue("resumeKey", finalized.resumeKey);
      setUploadedResumeName(file.name);
      await form.handleSubmit();
      toast.success("Resume uploaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload resume";
      toast.error(message);
    }
  };

  const onViewResume = async () => {
    const resumeKey = form.getFieldValue("resumeKey");
    if (!resumeKey) {
      return;
    }

    const result = await getResumeDownloadUrlFn({
      data: { resumeKey },
    });

    if (result.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
      return;
    }

    toast.info("Resume storage is not wired yet in this environment.");
  };
  const onSaveWorkEntry = async (index: number) => {
    setEntrySaveStatus((prev) => ({ ...prev, [index]: "saving" }));
    await form.handleSubmit();
    setEntrySaveStatus((prev) => ({ ...prev, [index]: "saved" }));
  };

  const onDismissEntrySaved = (index: number) => {
    setEntrySaveStatus((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const onAddSkill = (value: string) => {
    const trimmed = value.trim();
    const currentSkills = form.getFieldValue("skills");
    if (trimmed && !currentSkills.includes(trimmed)) {
      form.setFieldValue("skills", [...currentSkills, trimmed]);
      form.handleSubmit();
    }
    setSkillInput("");
  };

  const onRemoveSkill = (skill: string) => {
    const currentSkills = form.getFieldValue("skills");
    form.setFieldValue(
      "skills",
      currentSkills.filter((s: string) => s !== skill),
    );
    form.handleSubmit();
  };

  const onAddWorkEntry = () => {
    const currentEntries = form.getFieldValue("workHistory");
    form.setFieldValue("workHistory", [
      ...currentEntries,
      { company: "", title: "", startDate: "", endDate: "", description: "" },
    ]);
  };

  const onUpdateWorkEntry = (index: number, field: keyof WorkHistoryEntry, value: string) => {
    const currentEntries = form.getFieldValue("workHistory");
    const updated = currentEntries.map((entry: WorkHistoryEntry, i: number) =>
      i === index ? { ...entry, [field]: value } : entry,
    );
    form.setFieldValue("workHistory", updated);
  };

  const onRemoveWorkEntry = (index: number) => {
    const currentEntries = form.getFieldValue("workHistory");
    form.setFieldValue(
      "workHistory",
      currentEntries.filter((_: WorkHistoryEntry, i: number) => i !== index),
    );
    form.handleSubmit();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your candidate profile. This information is visible to companies when you apply.
          </p>
        </div>
        <AutoSaveIndicator status={autoSave.status} />
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Your name, headline, and professional summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form.AppField
              name="name"
              children={(field) => (
                <field.TextField label="Name" placeholder="Your full name" maxLength={100} />
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
              name="bio"
              children={(field) => (
                <field.TextareaField
                  label="Bio"
                  placeholder="Tell companies about yourself — your experience, interests, and what you're looking for."
                  maxLength={5000}
                  rows={4}
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
                      {form.getFieldValue("resumeKey") ? "Replace resume" : "Choose resume file"}
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX</p>
                  </div>
                </div>
                <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium">
                  Browse
                </span>
              </label>
              <p className="text-muted-foreground text-xs">
                Upload a PDF, DOC, or DOCX file. This is the resume attached when you apply.
              </p>
              {form.getFieldValue("resumeKey") ? (
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <HugeiconsIcon
                      icon={Upload04Icon}
                      strokeWidth={2}
                      className="size-4 text-primary"
                    />
                    <span>{uploadedResumeName ?? "Resume on file"}</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={onViewResume}>
                    View
                  </Button>
                </div>
              ) : null}
            </div>
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
            <div className="space-y-2">
              <Label htmlFor={skillInputId}>Add skills</Label>
              <Input
                id={skillInputId}
                placeholder="Type and press Enter (e.g. TypeScript, React)"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddSkill(skillInput);
                  }
                  if (e.key === "," && skillInput.trim()) {
                    e.preventDefault();
                    onAddSkill(skillInput);
                  }
                }}
              />
            </div>

            {currentSkillTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {currentSkillTags.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                    {skill}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onRemoveSkill(skill)}
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

        {/* Work History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work History</CardTitle>
            <CardDescription>Your professional experience. Most recent first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentWorkEntries.map((entry, index) => (
              <div
                key={`work-${index}`}
                className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Position {index + 1}
                    </span>
                    {entrySaveStatus[index] === "saving" ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          strokeWidth={2}
                          className="size-3 animate-spin"
                        />
                        Saving...
                      </span>
                    ) : entrySaveStatus[index] === "saved" ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-500">
                        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3" />
                        Saved
                        <button
                          type="button"
                          onClick={() => onDismissEntrySaved(index)}
                          className="ml-0.5 rounded-sm p-0.5 hover:bg-muted"
                        >
                          <HugeiconsIcon
                            icon={Cancel01Icon}
                            strokeWidth={2}
                            className="size-2.5 text-muted-foreground"
                          />
                        </button>
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onSaveWorkEntry(index)}
                      disabled={entrySaveStatus[index] === "saving"}
                      className="text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                    >
                      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onRemoveWorkEntry(index)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      placeholder="Company name"
                      value={entry.company}
                      onChange={(e) => onUpdateWorkEntry(index, "company", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Job title"
                      value={entry.title}
                      onChange={(e) => onUpdateWorkEntry(index, "title", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input
                      placeholder="Jan 2022"
                      value={entry.startDate}
                      onChange={(e) => onUpdateWorkEntry(index, "startDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End date</Label>
                    <Input
                      placeholder="Present"
                      value={entry.endDate ?? ""}
                      onChange={(e) => onUpdateWorkEntry(index, "endDate", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description of your role"
                    value={entry.description ?? ""}
                    onChange={(e) => onUpdateWorkEntry(index, "description", e.target.value)}
                  />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" className="w-full" onClick={onAddWorkEntry}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1.5 size-4" />
              Add position
            </Button>
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
            <form.AppField
              name="linkedinUrl"
              children={(field) => (
                <field.TextField
                  label="LinkedIn"
                  placeholder="https://linkedin.com/in/yourprofile"
                  type="url"
                />
              )}
            />
            <form.AppField
              name="githubUrl"
              children={(field) => (
                <field.TextField
                  label="GitHub"
                  placeholder="https://github.com/yourusername"
                  type="url"
                />
              )}
            />
            <form.AppField
              name="portfolioUrl"
              children={(field) => (
                <field.TextField
                  label="Portfolio"
                  placeholder="https://yourportfolio.com"
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
