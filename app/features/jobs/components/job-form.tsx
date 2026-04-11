import { Add01Icon, Calendar03Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  type EmploymentType,
  type ExperienceLevel,
  employmentTypeLabels,
  experienceLevelLabels,
  type JobStatus,
  type WorkplaceType,
  workplaceTypeLabels,
} from "@/shared/enums";
import { useAppForm } from "@/shared/form";

export interface JobFormData {
  title: string;
  description: string;
  requirements: string[];
  interviewQuestions: string[];
  status: JobStatus;
  location: string | null;
  workplaceType: WorkplaceType | null;
  employmentType: EmploymentType | null;
  experienceLevel: ExperienceLevel | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  teamSize: number | null;
  headcount: number | null;
  expiresAt: Date | null;
}

const emptyToNull = <T,>(value: T | ""): T | null => (value === "" ? null : value);

const positiveIntBlur =
  (label: string) =>
  ({ value }: { value: string }) => {
    if (!value) return undefined;
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isInteger(num)) return `${label} must be a whole number`;
    if (num <= 0) return `${label} must be positive`;
    return undefined;
  };

const workplaceOptions = Object.entries(workplaceTypeLabels).map(([value, label]) => ({
  value,
  label,
}));
const employmentOptions = Object.entries(employmentTypeLabels).map(([value, label]) => ({
  value,
  label,
}));
const experienceOptions = Object.entries(experienceLevelLabels).map(([value, label]) => ({
  value,
  label,
}));
const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];
const currencyOptions = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "CAD", label: "CAD" },
  { value: "AUD", label: "AUD" },
];

export function JobForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => void;
  submitLabel: string;
}) {
  const [requirementInput, setRequirementInput] = useState("");
  const [interviewQuestionInput, setInterviewQuestionInput] = useState("");
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const form = useAppForm({
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      requirements: defaultValues?.requirements ?? ([] as string[]),
      interviewQuestions: defaultValues?.interviewQuestions ?? ([] as string[]),
      status: defaultValues?.status ?? ("draft" as string),
      location: defaultValues?.location ?? "",
      workplaceType: (defaultValues?.workplaceType ?? "") as string,
      employmentType: (defaultValues?.employmentType ?? "") as string,
      experienceLevel: (defaultValues?.experienceLevel ?? "") as string,
      salaryMin: defaultValues?.salaryMin != null ? String(defaultValues.salaryMin) : "",
      salaryMax: defaultValues?.salaryMax != null ? String(defaultValues.salaryMax) : "",
      salaryCurrency: defaultValues?.salaryCurrency ?? "USD",
      teamSize: defaultValues?.teamSize != null ? String(defaultValues.teamSize) : "",
      headcount: defaultValues?.headcount != null ? String(defaultValues.headcount) : "",
      expiresAt: defaultValues?.expiresAt ? defaultValues.expiresAt.toISOString().slice(0, 10) : "",
    },

    validators: {
      onSubmit: ({ value }) => {
        const min = value.salaryMin ? Number(value.salaryMin) : null;
        const max = value.salaryMax ? Number(value.salaryMax) : null;
        if (min != null && max != null && min > max) {
          return {
            fields: {
              salaryMin: "Minimum salary cannot exceed maximum salary",
            },
          };
        }
        return undefined;
      },
    },

    onSubmit: ({ value }) => {
      const expiresAt = value.expiresAt?.trim()
        ? new Date(`${value.expiresAt}T23:59:59.999`)
        : null;

      onSubmit({
        title: value.title,
        description: value.description,
        requirements: value.requirements,
        interviewQuestions: value.interviewQuestions,
        status: value.status as JobStatus,
        location: value.location || null,
        workplaceType: emptyToNull(value.workplaceType) as WorkplaceType | null,
        employmentType: emptyToNull(value.employmentType) as EmploymentType | null,
        experienceLevel: emptyToNull(value.experienceLevel) as ExperienceLevel | null,
        salaryMin: value.salaryMin ? Number(value.salaryMin) : null,
        salaryMax: value.salaryMax ? Number(value.salaryMax) : null,
        salaryCurrency: value.salaryCurrency,
        teamSize: value.teamSize ? Number(value.teamSize) : null,
        headcount: value.headcount ? Number(value.headcount) : null,
        expiresAt,
      });
    },
  });
  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.handleSubmit();
  };
  const onRequirementInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRequirementInput(e.target.value);
  };
  const onInterviewQuestionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInterviewQuestionInput(e.target.value);
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      <div className="space-y-4">
        <form.AppField
          name="title"
          validators={{
            onBlur: z
              .string()
              .trim()
              .min(1, "Job title is required")
              .max(200, "Job title must be under 200 characters"),
          }}
          children={(field) => (
            <field.TextField
              label="Job title"
              placeholder="Senior Software Engineer"
              required
              maxLength={200}
            />
          )}
        />
        <form.AppField
          name="description"
          validators={{
            onBlur: z
              .string()
              .trim()
              .min(1, "Job description is required")
              .max(5000, "Description must be under 5,000 characters"),
          }}
          children={(field) => (
            <field.TextareaField
              label="Description"
              placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
              required
              maxLength={5000}
              rows={6}
            />
          )}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          Interview questions
        </p>
        <form.Field name="interviewQuestions" mode="array">
          {(iqField) => {
            const onInterviewQuestionInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
              const trimmed = interviewQuestionInput.trim();
              if (e.key === "Enter" && trimmed) {
                e.preventDefault();
                if (!iqField.state.value.includes(trimmed)) {
                  iqField.pushValue(trimmed);
                }
                setInterviewQuestionInput("");
              }
            };
            const onAddInterviewQuestion = () => {
              const trimmed = interviewQuestionInput.trim();
              if (trimmed && !iqField.state.value.includes(trimmed)) {
                iqField.pushValue(trimmed);
              }
              setInterviewQuestionInput("");
            };
            const onRemoveInterviewQuestion = (index: number) => {
              iqField.removeValue(index);
            };

            return (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Questions the interview agent will ask candidates during their conversational
                  application.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Are you authorized to work in the US?"
                    value={interviewQuestionInput}
                    onChange={onInterviewQuestionInputChange}
                    onKeyDown={onInterviewQuestionInputKeyDown}
                    maxLength={300}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onAddInterviewQuestion}
                  >
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
                  </Button>
                </div>
                {iqField.state.value.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {iqField.state.value.map((q, i) => {
                      const onRemoveClick = () => onRemoveInterviewQuestion(i);
                      return (
                        <li
                          key={`${q}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <span className="block size-1 shrink-0 rounded-full bg-primary" />
                            {q}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={onRemoveClick}
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            <HugeiconsIcon
                              icon={Cancel01Icon}
                              strokeWidth={2}
                              className="size-3.5"
                            />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          }}
        </form.Field>
      </div>

      <Separator />

      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Job details</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.AppField
            name="location"
            children={(field) => (
              <field.TextField label="Location" placeholder="San Francisco, CA" maxLength={200} />
            )}
          />
          <form.AppField
            name="workplaceType"
            children={(field) => (
              <field.SelectField
                label="Workplace"
                placeholder="Select type"
                options={workplaceOptions}
              />
            )}
          />
          <form.AppField
            name="employmentType"
            children={(field) => (
              <field.SelectField
                label="Employment type"
                placeholder="Select type"
                options={employmentOptions}
              />
            )}
          />
          <form.AppField
            name="experienceLevel"
            children={(field) => (
              <field.SelectField
                label="Experience level"
                placeholder="Select level"
                options={experienceOptions}
              />
            )}
          />
          <form.Field name="expiresAt">
            {(field) => {
              const selectedDate = field.state.value
                ? new Date(`${field.state.value}T00:00:00`)
                : undefined;
              const onDateSelect = (date: Date | undefined) => {
                field.handleChange(date ? date.toISOString().slice(0, 10) : "");
                setDeadlineOpen(false);
              };
              const onClearDeadline = () => {
                field.handleChange("");
                setDeadlineOpen(false);
              };

              return (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Application deadline</Label>
                  <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                      >
                        <span className={field.state.value ? "" : "text-muted-foreground"}>
                          {field.state.value
                            ? new Date(`${field.state.value}T00:00:00`).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "Pick a date"}
                        </span>
                        <HugeiconsIcon
                          icon={Calendar03Icon}
                          strokeWidth={2}
                          className="size-4 text-muted-foreground"
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={selectedDate} onSelect={onDateSelect} />
                      {field.state.value ? (
                        <div className="border-t p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={onClearDeadline}
                          >
                            Clear date
                          </Button>
                        </div>
                      ) : null}
                    </PopoverContent>
                  </Popover>
                  <p className="text-muted-foreground text-xs">
                    Optional. If set, this role will automatically close after that date.
                  </p>
                </div>
              );
            }}
          </form.Field>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Compensation</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <form.AppField
            name="salaryMin"
            validators={{ onBlur: positiveIntBlur("Minimum salary") }}
            children={(field) => <field.TextField label="Min salary" placeholder="120000" />}
          />
          <form.AppField
            name="salaryMax"
            validators={{ onBlur: positiveIntBlur("Maximum salary") }}
            children={(field) => <field.TextField label="Max salary" placeholder="180000" />}
          />
          <form.AppField
            name="salaryCurrency"
            children={(field) => <field.SelectField label="Currency" options={currencyOptions} />}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Team</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.AppField
            name="teamSize"
            validators={{ onBlur: positiveIntBlur("Team size") }}
            children={(field) => (
              <field.TextField
                label="Team size"
                placeholder="8"
                description="Number of people on the team"
              />
            )}
          />
          <form.AppField
            name="headcount"
            validators={{ onBlur: positiveIntBlur("Headcount") }}
            children={(field) => (
              <field.TextField
                label="Open positions"
                placeholder="1"
                description="How many hires for this role"
              />
            )}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <form.Field name="requirements" mode="array">
          {(reqField) => {
            const onRequirementInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
              const trimmed = requirementInput.trim();
              if (e.key === "Enter" && trimmed) {
                e.preventDefault();
                if (!reqField.state.value.includes(trimmed)) {
                  reqField.pushValue(trimmed);
                }
                setRequirementInput("");
              }
            };
            const onAddRequirement = () => {
              const trimmed = requirementInput.trim();
              if (trimmed && !reqField.state.value.includes(trimmed)) {
                reqField.pushValue(trimmed);
              }
              setRequirementInput("");
            };
            const onRemoveRequirement = (index: number) => reqField.removeValue(index);

            return (
              <div className="space-y-2">
                <Label>Requirements</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 3+ years React experience"
                    value={requirementInput}
                    onChange={onRequirementInputChange}
                    onKeyDown={onRequirementInputKeyDown}
                    maxLength={200}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={onAddRequirement}>
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
                  </Button>
                </div>
                {reqField.state.value.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {reqField.state.value.map((req, i) => {
                      const onRemoveClick = () => onRemoveRequirement(i);
                      return (
                        <li
                          key={`${req}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <span className="block size-1 shrink-0 rounded-full bg-primary" />
                            {req}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={onRemoveClick}
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            <HugeiconsIcon
                              icon={Cancel01Icon}
                              strokeWidth={2}
                              className="size-3.5"
                            />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          }}
        </form.Field>
      </div>

      <Separator />

      <div className="space-y-4">
        <form.AppField
          name="status"
          children={(field) => (
            <field.SelectField
              label="Status"
              options={statusOptions}
              description='Only "Open" jobs are visible to candidates.'
            />
          )}
        />
        <form.AppForm>
          <form.SubmitButton label={submitLabel} submittingLabel="Saving..." />
        </form.AppForm>
      </div>
    </form>
  );
}
