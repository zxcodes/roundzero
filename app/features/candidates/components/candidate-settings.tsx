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
import { ResumeUploadField } from "@/features/candidates/components/resume-upload-field";
import {
  type getMyCandidateProfile,
  type UpdateCandidateProfileInput,
  updateMyCandidateProfile,
} from "@/features/candidates/server/functions";
import type { User } from "@/router";
import { AutoSaveIndicator, useAutoSaveStatus } from "@/shared/auto-save-indicator";
import { useAppForm } from "@/shared/form";

type CandidateProfile = NonNullable<Awaited<ReturnType<typeof getMyCandidateProfile>>>;
type WorkHistoryEntry = NonNullable<UpdateCandidateProfileInput["workHistory"]>[number];

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
  const onYearChange = (nextYear: string) => {
    if (selected) {
      onSelect(`${nextYear}-${format(selected, "MM")}`);
      return;
    }
    onSelect(`${nextYear}-01`);
  };
  const onClear = () => {
    onSelect(null);
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
              <Select value={String(selectedYear)} onValueChange={onYearChange}>
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
                  const onMonthClick = () => {
                    onSelectMonth(index);
                  };

                  return (
                    <Button
                      key={month}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={onMonthClick}
                    >
                      {month}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end border-t pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>
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
      if (value.name && value.name !== user.name) {
        await updateNameMutation.mutateAsync({
          data: { name: value.name },
        });
      }

      await updateProfileMutation.mutateAsync({
        data: {
          headline: value.headline || null,
          resumeKey: value.resumeKey || null,
          bio: value.bio || null,
          skills: value.skills.length > 0 ? value.skills : null,
          workHistory: value.workHistory.length > 0 ? value.workHistory : null,
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
  const resumeDetails = profile.resumeUpdatedAt
    ? `Resume last updated ${format(new Date(profile.resumeUpdatedAt), "MMM d, yyyy 'at' h:mm a")}`
    : null;

  const skillInputId = `skill-input-${id}`;
  const onResumeUploaded = async (resume: { resumeKey: string }) => {
    form.setFieldValue("resumeKey", resume.resumeKey);
    await form.handleSubmit();
  };
  const onSkillInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSkillInput(e.target.value);
  };
  const onSaveWorkEntry = async (index: number, entry: WorkHistoryEntry) => {
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
  const onUpdateWorkEntry = (index: number, entry: WorkHistoryEntry) => {
    form.setFieldValue(`workHistory[${index}]`, {
      ...entry,
      description: entry.description ?? undefined,
    });
  };
  const onUpdateWorkEntryCompany = (index: number, entry: WorkHistoryEntry, company: string) => {
    onUpdateWorkEntry(index, { ...entry, company });
  };
  const onUpdateWorkEntryTitle = (index: number, entry: WorkHistoryEntry, title: string) => {
    onUpdateWorkEntry(index, { ...entry, title });
  };
  const onUpdateWorkEntryStartMonth = (
    index: number,
    entry: WorkHistoryEntry,
    value: string | null,
  ) => {
    onUpdateWorkEntry(index, { ...entry, startMonth: value ?? "" });
  };
  const onUpdateWorkEntryEndMonth = (
    index: number,
    entry: WorkHistoryEntry,
    value: string | null,
  ) => {
    onUpdateWorkEntry(index, { ...entry, endMonth: value });
  };
  const onUpdateWorkEntryCurrent = (
    index: number,
    entry: WorkHistoryEntry,
    checked: boolean | "indeterminate",
  ) => {
    const isChecked = checked === true;
    onUpdateWorkEntry(index, {
      ...entry,
      currentlyWorkingHere: isChecked,
      endMonth: isChecked ? null : entry.endMonth,
    });
  };
  const onUpdateWorkEntryDescription = (
    index: number,
    entry: WorkHistoryEntry,
    description: string,
  ) => {
    onUpdateWorkEntry(index, {
      ...entry,
      description: description || undefined,
    });
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
                  placeholder="Tell companies about yourself. Your experience, interests, and what you're looking for."
                  maxLength={5000}
                  rows={4}
                />
              )}
            />

            <ResumeUploadField
              value={currentResumeKey}
              details={resumeDetails}
              showViewButton
              description="Upload a PDF, DOC, or DOCX file. This is the resume attached when you apply."
              onUploaded={onResumeUploaded}
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
                      form.handleSubmit();
                    }

                    setSkillInput("");
                  }
                };
                const onRemoveSkill = (index: number) => {
                  skillsField.removeValue(index);
                  form.handleSubmit();
                };

                return (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={skillInputId}>Add skills</Label>
                      <Input
                        id={skillInputId}
                        placeholder="Type and press Enter (e.g. TypeScript, React)"
                        value={skillInput}
                        onChange={onSkillInputChange}
                        onKeyDown={onSkillInputKeyDown}
                      />
                    </div>

                    {skillsField.state.value.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {skillsField.state.value.map((skill, index) =>
                          (() => {
                            const onRemoveSkillClick = () => {
                              onRemoveSkill(index);
                            };

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
                          })(),
                        )}
                      </div>
                    ) : null}
                  </>
                );
              }}
            </form.Field>
          </CardContent>
        </Card>

        {/* Work History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work History</CardTitle>
            <CardDescription>Your professional experience. Most recent first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form.Field name="workHistory" mode="array">
              {(workHistoryField) => {
                const onRemoveWorkEntry = (index: number) => {
                  workHistoryField.removeValue(index);
                  form.handleSubmit();
                };
                const onAddWorkEntry = () => {
                  workHistoryField.pushValue({
                    company: "",
                    title: "",
                    startMonth: "",
                    endMonth: null,
                    currentlyWorkingHere: false,
                    description: undefined,
                  });
                };

                return (
                  <>
                    {workHistoryField.state.value.map((entry, index) =>
                      (() => {
                        const onDismissEntrySavedClick = () => {
                          onDismissEntrySaved(index);
                        };
                        const onSaveWorkEntryClick = () => {
                          onSaveWorkEntry(index, entry);
                        };
                        const onRemoveWorkEntryClick = () => {
                          onRemoveWorkEntry(index);
                        };
                        const onCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                          onUpdateWorkEntryCompany(index, entry, e.target.value);
                        };
                        const onTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                          onUpdateWorkEntryTitle(index, entry, e.target.value);
                        };
                        const onStartMonthSelect = (value: string | null) => {
                          onUpdateWorkEntryStartMonth(index, entry, value);
                        };
                        const onEndMonthSelect = (value: string | null) => {
                          onUpdateWorkEntryEndMonth(index, entry, value);
                        };
                        const onCurrentChange = (checked: boolean | "indeterminate") => {
                          onUpdateWorkEntryCurrent(index, entry, checked);
                        };
                        const onDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                          onUpdateWorkEntryDescription(index, entry, e.target.value);
                        };

                        return (
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
                                    <HugeiconsIcon
                                      icon={Tick02Icon}
                                      strokeWidth={2}
                                      className="size-3"
                                    />
                                    Saved
                                    <button
                                      type="button"
                                      onClick={onDismissEntrySavedClick}
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
                                  onClick={onSaveWorkEntryClick}
                                  disabled={entrySaveStatus[index] === "saving"}
                                  className="text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                                >
                                  <HugeiconsIcon
                                    icon={Tick02Icon}
                                    strokeWidth={2}
                                    className="size-4"
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={onRemoveWorkEntryClick}
                                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <HugeiconsIcon
                                    icon={Cancel01Icon}
                                    strokeWidth={2}
                                    className="size-4"
                                  />
                                </Button>
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Company</Label>
                                <Input
                                  placeholder="Company name"
                                  value={entry.company}
                                  onChange={onCompanyChange}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                  placeholder="Job title"
                                  value={entry.title}
                                  onChange={onTitleChange}
                                />
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <WorkHistoryMonthPicker
                                label="Start month"
                                value={entry.startMonth}
                                onSelect={onStartMonthSelect}
                              />
                              <WorkHistoryMonthPicker
                                label="End month"
                                value={entry.endMonth}
                                disabled={entry.currentlyWorkingHere}
                                onSelect={onEndMonthSelect}
                              />
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Use month and year only. Current roles can leave end month empty.
                            </p>

                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={entry.currentlyWorkingHere}
                                onCheckedChange={onCurrentChange}
                              />
                              <Label>Currently working here</Label>
                            </div>

                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                placeholder="Brief description of your role"
                                value={entry.description ?? ""}
                                onChange={onDescriptionChange}
                              />
                            </div>
                          </div>
                        );
                      })(),
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={onAddWorkEntry}
                    >
                      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="mr-1.5 size-4" />
                      Add position
                    </Button>
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
