import { Add01Icon, Cancel01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
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
import { updateUserName } from "@/features/auth/server/functions";
import { updateMyCandidateProfile } from "@/features/candidates/server/functions";
import type { User } from "@/router";
import { useAppForm } from "@/shared/form";

type WorkHistoryEntry = {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
};

type CandidateProfile = {
  id: string;
  userId: string;
  headline: string | null;
  resumeUrl: string | null;
  bio: string | null;
  skills: string[];
  workHistory: WorkHistoryEntry[];
  links: { linkedin?: string; github?: string; portfolio?: string } | null;
};

export function CandidateSettings({ profile, user }: { profile: CandidateProfile; user: User }) {
  const router = useRouter();
  const id = useId();

  const updateProfileFn = useServerFn(updateMyCandidateProfile);
  const updateProfileMutation = useMutation({
    mutationFn: updateProfileFn,
  });

  const updateNameFn = useServerFn(updateUserName);
  const updateNameMutation = useMutation({
    mutationFn: updateNameFn,
  });

  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const workHistory = Array.isArray(profile.workHistory) ? profile.workHistory : [];
  const links =
    profile.links && typeof profile.links === "object" && !Array.isArray(profile.links)
      ? profile.links
      : { linkedin: "", github: "", portfolio: "" };

  const form = useAppForm({
    defaultValues: {
      name: user.name ?? "",
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      linkedinUrl: links.linkedin ?? "",
      githubUrl: links.github ?? "",
      portfolioUrl: links.portfolio ?? "",
    },
    onSubmit: async ({ value }) => {
      const trimmedName = value.name.trim();

      // Update name if changed
      if (trimmedName && trimmedName !== user.name) {
        await updateNameMutation.mutateAsync({
          data: { name: trimmedName },
        });
      }

      // Update profile
      await updateProfileMutation.mutateAsync({
        data: {
          headline: value.headline.trim() || null,
          resumeUrl: profile.resumeUrl,
          bio: value.bio.trim() || null,
          skills: skillTags.length > 0 ? skillTags : null,
          workHistory: workEntries.length > 0 ? workEntries : null,
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

      toast.success("Profile updated");
      await router.invalidate();
    },
  });

  // Skills tag input
  const [skillTags, setSkillTags] = useState<string[]>(skills);
  const [skillInput, setSkillInput] = useState("");

  // Work history
  const [workEntries, setWorkEntries] = useState<WorkHistoryEntry[]>(workHistory);

  const skillInputId = `skill-input-${id}`;
  const resumeId = `resume-${id}`;

  const onAddSkill = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !skillTags.includes(trimmed)) {
      setSkillTags([...skillTags, trimmed]);
    }
    setSkillInput("");
  };

  const onRemoveSkill = (skill: string) => {
    setSkillTags(skillTags.filter((s) => s !== skill));
  };

  const onAddWorkEntry = () => {
    setWorkEntries([
      ...workEntries,
      { company: "", title: "", startDate: "", endDate: "", description: "" },
    ]);
  };

  const onUpdateWorkEntry = (index: number, field: keyof WorkHistoryEntry, value: string) => {
    const updated = workEntries.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry,
    );
    setWorkEntries(updated);
  };

  const onRemoveWorkEntry = (index: number) => {
    setWorkEntries(workEntries.filter((_, i) => i !== index));
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your candidate profile. This information is visible to companies when you apply.
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

            {/* Resume upload placeholder */}
            <div className="space-y-2">
              <Label htmlFor={resumeId}>Resume</Label>
              <button
                type="button"
                id={resumeId}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-8 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
                onClick={() => toast.info("Resume upload will be available soon")}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <HugeiconsIcon
                    icon={Upload04Icon}
                    strokeWidth={1.5}
                    className="size-5 text-muted-foreground"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Upload your resume</p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX (coming soon)</p>
                </div>
              </button>
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

            {skillTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skillTags.map((skill) => (
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
            {workEntries.map((entry, index) => (
              <div
                key={`work-${index}`}
                className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Position {index + 1}
                  </span>
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

        <Separator />

        <form.AppForm>
          <form.SubmitButton label="Save changes" submittingLabel="Saving..." />
        </form.AppForm>
      </form>
    </div>
  );
}
