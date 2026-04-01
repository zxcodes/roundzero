import {
  Add01Icon,
  Calendar03Icon,
  Cancel01Icon,
  Loading03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserName } from "@/features/auth/server/functions";
import {
  type getMyCandidateProfile,
  type UpdateCandidateProfileInput,
  updateMyCandidateProfile,
} from "@/features/candidates/server/functions";
import { ResumeUploadField } from "@/features/candidates/components/resume-upload-field";
import type { User } from "@/router";
import { AutoSaveIndicator, useAutoSaveStatus } from "@/shared/auto-save-indicator";
import { useAppForm } from "@/shared/form";

type CandidateProfile = NonNullable<Awaited<ReturnType<typeof getMyCandidateProfile>>>;
type WorkHistoryEntry = NonNullable<UpdateCandidateProfileInput["workHistory"]>[number];
type WorkHistoryTextField = "company" | "title" | "startMonth" | "description";

function parseMonthValue(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const [year, month] = value.split("-").map(Number);
  if (!year || !month) {
    return undefined;
  }

  return new Date(year, month - 1, 1);
}

function formatMonthValue(value: string | null | undefined) {
  const date = parseMonthValue(value);
  return date ? format(date, "MMM yyyy") : "Pick month";
}

function WorkHistoryMonthPicker({
  label,
  value,
  disabled = false,
  onSelect,
}: {
  label: string;
  value: string | null;
  disabled?: boolean;
  onSelect: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseMonthValue(value);
  const selectedYear = selected?.getFullYear() ?? new Date().getFullYear();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const years = Array.from({ length: new Date().getFullYear() - 1980 + 3 }, (_, index) =>
    String(1980 + index),
  );

  const onSelectMonth = (monthIndex: number) => {
    const month = String(monthIndex + 1).padStart(2, "0");
    onSelect(`${selectedYear}-${month}`);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            <span>{formatMonthValue(value)}</span>
            <HugeiconsIcon
              icon={Calendar03Icon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(nextYear) => {
                  if (selected) {
                    onSelect(`${nextYear}-${format(selected, "MM")}`);
                    return;
                  }
                  onSelect(`${nextYear}-01`);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <div className="grid grid-cols-3 gap-2">
                {months.map((month, index) => {
                  const isSelected = selected?.getMonth() === index;

                  return (
                    <Button
                      key={month}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => onSelectMonth(index)}
                    >
                      {month}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end border-t pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function CandidateSettings({ profile, user }: { profile: CandidateProfile; user: User }) {
  const router = useRouter();
  const id = useId();

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
      workHistory: Array.isArray(profile.workHistory)
        ? profile.workHistory.map((entry) => ({
            ...entry,
            description: entry.description ?? undefined,
          }))
        : [],
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
  const currentResumeKey = useStore(form.store, (state) => state.values.resumeKey);
  const currentSkillTags = useStore(form.store, (state) => state.values.skills);
  const currentWorkEntries = useStore(form.store, (state) => state.values.workHistory);

  const skillInputId = `skill-input-${id}`;
  const onSaveWorkEntry = async (index: number) => {
    const entry = form.getFieldValue("workHistory")[index];
    if (!entry) {
      return;
    }

    if (!entry.company.trim() || !entry.title.trim() || !entry.startMonth) {
      toast.error("Add company, title, and start month before saving this role.");
      return;
    }

    if (!entry.currentlyWorkingHere && !entry.endMonth) {
      toast.error("Add an end month or mark the role as current.");
      return;
    }

    if (entry.endMonth && entry.endMonth < entry.startMonth) {
      toast.error("End month must be after start month.");
      return;
    }

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
      {
        company: "",
        title: "",
        startMonth: "",
        endMonth: null,
        currentlyWorkingHere: false,
        description: undefined,
      },
    ]);
  };

  const onUpdateWorkEntryText = (index: number, field: WorkHistoryTextField, value: string) => {
    const currentEntries = form.getFieldValue("workHistory");
    const updated = currentEntries.map((entry, i) =>
      i === index
        ? field === "company"
          ? { ...entry, company: value, description: entry.description ?? undefined }
          : field === "title"
            ? { ...entry, title: value, description: entry.description ?? undefined }
            : field === "startMonth"
              ? { ...entry, startMonth: value, description: entry.description ?? undefined }
              : { ...entry, description: value || undefined }
        : entry,
    );
    form.setFieldValue("workHistory", updated);
  };

  const onUpdateWorkEntryEndMonth = (index: number, endMonth: string | null) => {
    const currentEntries = form.getFieldValue("workHistory");
    const updated = currentEntries.map((entry, i) =>
      i === index ? { ...entry, endMonth, description: entry.description ?? undefined } : entry,
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

            <ResumeUploadField
              value={currentResumeKey}
              showViewButton
              description="Upload a PDF, DOC, or DOCX file. This is the resume attached when you apply."
              onUploaded={async (resume) => {
                form.setFieldValue("resumeKey", resume.resumeKey);
                await form.handleSubmit();
              }}
            />
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
                      onChange={(e) => onUpdateWorkEntryText(index, "company", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Job title"
                      value={entry.title}
                      onChange={(e) => onUpdateWorkEntryText(index, "title", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <WorkHistoryMonthPicker
                    label="Start month"
                    value={entry.startMonth}
                    onSelect={(value) => onUpdateWorkEntryText(index, "startMonth", value ?? "")}
                  />
                  <WorkHistoryMonthPicker
                    label="End month"
                    value={entry.endMonth}
                    disabled={entry.currentlyWorkingHere}
                    onSelect={(value) => onUpdateWorkEntryEndMonth(index, value)}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Use month and year only. Current roles can leave end month empty.
                </p>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={entry.currentlyWorkingHere}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      const currentEntries = form.getFieldValue("workHistory");
                      const updated = currentEntries.map((currentEntry, i) =>
                        i === index
                          ? {
                              ...currentEntry,
                              description: currentEntry.description ?? undefined,
                              currentlyWorkingHere: isChecked,
                              endMonth: isChecked ? null : currentEntry.endMonth,
                            }
                          : currentEntry,
                      );
                      form.setFieldValue("workHistory", updated);
                    }}
                  />
                  <Label>Currently working here</Label>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description of your role"
                    value={entry.description ?? ""}
                    onChange={(e) => onUpdateWorkEntryText(index, "description", e.target.value)}
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
