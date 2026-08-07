import { Add01Icon, Calendar03Icon, Cancel01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UnsavedChangesBar } from "@/components/unsaved-changes-bar";
import { FREE_REPORT_DEFAULTS, reportTargetRangeLabel } from "@/features/entitlements/entitlements";
import { useEntitlements } from "@/features/entitlements/hooks/use-entitlements";
import { JobDescriptionEditor } from "@/features/jobs/components/job-description-editor";
import { JobPreviewDialog } from "@/features/jobs/components/job-preview-dialog";
import { MAX_JOB_DESCRIPTION_LENGTH } from "@/features/jobs/constants";
import { formatDate } from "@/shared/date";
import {
  type EmploymentType,
  type ExperienceLevel,
  employmentTypeLabels,
  experienceLevelLabels,
  type JobStatus,
  type SalaryCurrency,
  salaryCurrencyLabels,
  salaryCurrencySchema,
  type WorkplaceType,
  workplaceTypeLabels,
} from "@/shared/enums";

export interface JobFormData {
  title: string;
  description: string;
  screeningQuestions: string[];
  status: JobStatus;
  location: string | null;
  workplaceType: WorkplaceType;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  teamSize: number | null;
  headcount: number | null;
  finalReportTarget: number;
  expiresAt: Date | null;
}

/** Job row fields needed to hydrate the create/edit form. */
export type JobFormSource = {
  title: string;
  description: string;
  screeningQuestions: unknown;
  status: string;
  location: string | null;
  workplaceType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  teamSize: number | null;
  headcount: number | null;
  finalReportTarget: number;
  expiresAt: Date | string | null;
};

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/**
 * Map a persisted job into full form defaults.
 * Every JobFormData key must be set here so edit cannot omit a field and wipe it on save.
 */
export function jobToFormDefaults(job: JobFormSource): JobFormData {
  const status: JobStatus =
    job.status === "draft" || job.status === "open" || job.status === "closed"
      ? job.status
      : "draft";

  return {
    title: job.title,
    description: job.description,
    screeningQuestions: asStringList(job.screeningQuestions),
    status,
    location: job.location,
    // Nullable in DB for legacy/import rows; form requires a selection before save.
    workplaceType: (job.workplaceType ?? undefined) as WorkplaceType,
    employmentType: (job.employmentType ?? undefined) as EmploymentType,
    experienceLevel: (job.experienceLevel ?? undefined) as ExperienceLevel,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    teamSize: job.teamSize,
    headcount: job.headcount,
    finalReportTarget: job.finalReportTarget,
    expiresAt: job.expiresAt != null ? new Date(job.expiresAt) : null,
  };
}

const requiredString = (max: number, message: string) => z.string().trim().min(1, message).max(max);

const optionalPositiveInt = z
  .string()
  .refine((val) => !val || (Number.isInteger(Number(val)) && Number(val) > 0), {
    message: "Must be a positive whole number",
  });

const formSchema = z
  .object({
    title: requiredString(200, "Job title is required"),
    description: requiredString(MAX_JOB_DESCRIPTION_LENGTH, "Job description is required"),
    screeningQuestions: z.array(z.string()),
    status: z.enum(["draft", "open", "closed"]),
    location: z.string().max(200),
    workplaceType: z.string().min(1, "Workplace type is required"),
    employmentType: z.string().min(1, "Employment type is required"),
    experienceLevel: z.string().min(1, "Experience level is required"),
    salaryMin: optionalPositiveInt,
    salaryMax: optionalPositiveInt,
    salaryCurrency: z.string().min(1),
    teamSize: optionalPositiveInt,
    headcount: optionalPositiveInt,
    finalReportTarget: z
      .string()
      .refine((val) => Number.isInteger(Number(val)) && Number(val) >= 1 && Number(val) <= 50, {
        message: "Final report target must be between 1 and 50",
      }),
    expiresAt: z.string(),
  })
  .refine(
    (data) => {
      if (data.salaryMin && data.salaryMax) {
        return Number(data.salaryMin) <= Number(data.salaryMax);
      }
      return true;
    },
    { message: "Minimum salary cannot exceed maximum salary", path: ["salaryMin"] },
  );

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

const workplaceOptions = toOptions(workplaceTypeLabels);
const employmentOptions = toOptions(employmentTypeLabels);
const experienceOptions = toOptions(experienceLevelLabels);

const draftOpenStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
] as const;

const closedStatusOption = { value: "closed", label: "Closed" } as const;
const currencyOptions = salaryCurrencySchema.options.map((value) => ({
  value,
  label: salaryCurrencyLabels[value],
}));

const LOCALE_BY_CURRENCY: Record<SalaryCurrency, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  CAD: "en-CA",
  AUD: "en-AU",
  INR: "en-IN",
};

const SALARY_PLACEHOLDERS: Record<SalaryCurrency, { min: string; max: string }> = {
  USD: { min: "80,000", max: "150,000" },
  EUR: { min: "60,000", max: "120,000" },
  GBP: { min: "50,000", max: "100,000" },
  CAD: { min: "80,000", max: "160,000" },
  AUD: { min: "90,000", max: "170,000" },
  INR: { min: "8,00,000", max: "25,00,000" },
};

/** Local calendar date as YYYY-MM-DD (avoids UTC day-shift from toISOString). */
const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function JobForm({
  defaultValues,
  onSubmit,
  submitLabel,
  companyName,
  onCancel,
  isSubmitting: isSubmittingProp,
}: {
  defaultValues?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => Promise<void>;
  submitLabel: string;
  companyName?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
}) {
  const [screeningQuestionInput, setScreeningQuestionInput] = useState("");
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const entitlements = useEntitlements();
  const reports = entitlements?.reports ?? FREE_REPORT_DEFAULTS;
  const reportLimit = reports.perJobLimit;
  const existingReportTarget = defaultValues?.finalReportTarget ?? null;
  // Drafts are always allowed; opening a new job is gated. Editing a job that is
  // already open never consumes a new slot, so don't lock it.
  const openLocked =
    !(entitlements?.jobs.canOpenAnother ?? true) && defaultValues?.status !== "open";
  // Closed is archive/expiry state — only surface it when the job is already closed
  // so the select shows the real status instead of a blank value.
  const statusOptions =
    defaultValues?.status === "closed"
      ? [...draftOpenStatusOptions, closedStatusOption]
      : draftOpenStatusOptions;
  const defaultReportTarget =
    defaultValues?.finalReportTarget != null
      ? defaultValues.finalReportTarget
      : reports.defaultTarget;
  const targetAboveCurrentPlan =
    existingReportTarget !== null && existingReportTarget > reportLimit;
  const submitSchema = formSchema.superRefine((value, context) => {
    const target = Number(value.finalReportTarget);
    if (existingReportTarget !== null && target < existingReportTarget) {
      context.addIssue({
        code: "custom",
        path: ["finalReportTarget"],
        message: "The report target can only be increased.",
      });
    }
    if (target > reportLimit && target !== existingReportTarget) {
      context.addIssue({
        code: "custom",
        path: ["finalReportTarget"],
        message: `Upgrade your plan to increase the report target above ${reportLimit}.`,
      });
    }
  });

  const form = useForm({
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      screeningQuestions: defaultValues?.screeningQuestions ?? ([] as string[]),
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
      finalReportTarget: String(defaultReportTarget),
      expiresAt: defaultValues?.expiresAt
        ? toDateInputValue(new Date(defaultValues.expiresAt))
        : "",
    },

    validators: { onSubmit: submitSchema },
    canSubmitWhenInvalid: true,

    onSubmit: async ({ value }) => {
      const expiresAt = value.expiresAt?.trim()
        ? new Date(`${value.expiresAt}T23:59:59.999`)
        : null;

      await onSubmit({
        title: value.title,
        description: value.description,
        screeningQuestions: value.screeningQuestions,
        status: value.status as JobStatus,
        location: value.location || null,
        workplaceType: value.workplaceType as WorkplaceType,
        employmentType: value.employmentType as EmploymentType,
        experienceLevel: value.experienceLevel as ExperienceLevel,
        salaryMin: value.salaryMin ? Number(value.salaryMin) : null,
        salaryMax: value.salaryMax ? Number(value.salaryMax) : null,
        salaryCurrency: value.salaryCurrency,
        teamSize: value.teamSize ? Number(value.teamSize) : null,
        headcount: value.headcount ? Number(value.headcount) : null,
        finalReportTarget: Number(value.finalReportTarget),
        expiresAt,
      });
    },
  });

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void form.handleSubmit();
  };
  const onScreeningQuestionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScreeningQuestionInput(e.target.value);
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      {onCancel ? (
        <form.Subscribe
          selector={(state) => ({ isDirty: state.isDirty, isSubmitting: state.isSubmitting })}
        >
          {({ isDirty, isSubmitting }) => (
            <UnsavedChangesBar
              isDirty={isDirty}
              isSubmitting={isSubmitting}
              onDiscard={onCancel}
              onSave={() => void form.handleSubmit()}
            />
          )}
        </form.Subscribe>
      ) : null}
      <FieldGroup>
        <form.Field
          name="title"
          validators={{
            onBlur: requiredString(200, "Job title is required"),
            onSubmit: requiredString(200, "Job title is required"),
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Job title <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id={field.name}
                  placeholder="Senior Software Engineer"
                  required
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

        <form.Field
          name="description"
          validators={{
            onBlur: requiredString(MAX_JOB_DESCRIPTION_LENGTH, "Job description is required"),
            onSubmit: requiredString(MAX_JOB_DESCRIPTION_LENGTH, "Job description is required"),
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Description <span className="text-destructive">*</span>
                </FieldLabel>
                <JobDescriptionEditor
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                  invalid={isInvalid}
                />
                <p className="text-muted-foreground text-xs">
                  Paste Markdown from ChatGPT or format the complete role here, including
                  responsibilities and qualifications. {field.state.value.length.toLocaleString()} /{" "}
                  {MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()} characters
                </p>
                {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-base font-semibold tracking-tight">Screening questions</h3>
        <form.Field name="screeningQuestions" mode="array">
          {(iqField) => {
            const onScreeningQuestionInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
              const trimmed = screeningQuestionInput.trim();
              if (e.key === "Enter" && trimmed) {
                e.preventDefault();
                if (!iqField.state.value.includes(trimmed)) {
                  iqField.pushValue(trimmed);
                }
                setScreeningQuestionInput("");
              }
            };
            const onAddScreeningQuestion = () => {
              const trimmed = screeningQuestionInput.trim();
              if (trimmed && !iqField.state.value.includes(trimmed)) {
                iqField.pushValue(trimmed);
              }
              setScreeningQuestionInput("");
            };
            const onRemoveScreeningQuestion = (index: number) => {
              iqField.removeValue(index);
            };

            return (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Add only must-know constraints Zero should ask first, such as time-zone overlap,
                  onsite attendance, work authorization, or start date.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Are you authorized to work in the US?"
                    value={screeningQuestionInput}
                    onChange={onScreeningQuestionInputChange}
                    onKeyDown={onScreeningQuestionInputKeyDown}
                    maxLength={300}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onAddScreeningQuestion}
                  >
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
                  </Button>
                </div>
                {iqField.state.value.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {iqField.state.value.map((q, i) => {
                      const onRemoveClick = () => onRemoveScreeningQuestion(i);
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
        <h3 className="text-base font-semibold tracking-tight">Job details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field
            name="location"
            validators={{ onBlur: z.string().max(200, "Location must be under 200 characters") }}
          >
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

          <form.Field
            name="workplaceType"
            validators={{
              onSubmit: z.string().min(1, "Workplace type is required"),
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              const onWorkplaceChange = (val: string) => field.handleChange(val);
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Workplace <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select value={field.state.value} onValueChange={onWorkplaceChange}>
                    <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {workplaceOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field
            name="employmentType"
            validators={{
              onSubmit: z.string().min(1, "Employment type is required"),
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              const onEmploymentChange = (val: string) => field.handleChange(val);
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Employment type <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select value={field.state.value} onValueChange={onEmploymentChange}>
                    <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {employmentOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field
            name="experienceLevel"
            validators={{
              onSubmit: z.string().min(1, "Experience level is required"),
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              const onExperienceChange = (val: string) => field.handleChange(val);
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Experience level <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select value={field.state.value} onValueChange={onExperienceChange}>
                    <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="expiresAt">
            {(field) => {
              const selectedDate = field.state.value
                ? new Date(`${field.state.value}T00:00:00`)
                : undefined;
              const onDateSelect = (date: Date | undefined) => {
                field.handleChange(date ? toDateInputValue(date) : "");
                setDeadlineOpen(false);
              };
              const onClearDeadline = () => {
                field.handleChange("");
                setDeadlineOpen(false);
              };

              return (
                <Field>
                  <FieldLabel htmlFor={field.name}>Application deadline</FieldLabel>
                  <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal"
                      >
                        <span className={field.state.value ? "" : "text-muted-foreground"}>
                          {field.state.value
                            ? formatDate(new Date(`${field.state.value}T00:00:00`))
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
                </Field>
              );
            }}
          </form.Field>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-base font-semibold tracking-tight">Compensation</h3>
        <form.Subscribe selector={(state) => state.values.salaryCurrency}>
          {(currency) => {
            const placeholders =
              SALARY_PLACEHOLDERS[(currency || "USD") as SalaryCurrency] ?? SALARY_PLACEHOLDERS.USD;
            const locale = LOCALE_BY_CURRENCY[(currency || "USD") as SalaryCurrency] ?? "en-US";
            return (
              <div className="grid gap-4 sm:grid-cols-3">
                <form.Field name="salaryMin" validators={{ onBlur: optionalPositiveInt }}>
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    const rawValue = field.state.value;
                    const displayValue = rawValue
                      ? new Intl.NumberFormat(locale).format(Number(rawValue))
                      : "";
                    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      field.handleChange(digits);
                    };
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Min salary</FieldLabel>
                        <Input
                          id={field.name}
                          inputMode="numeric"
                          placeholder={placeholders.min}
                          value={displayValue}
                          onBlur={field.handleBlur}
                          onChange={onChange}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field name="salaryMax" validators={{ onBlur: optionalPositiveInt }}>
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                    const rawValue = field.state.value;
                    const displayValue = rawValue
                      ? new Intl.NumberFormat(locale).format(Number(rawValue))
                      : "";
                    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      field.handleChange(digits);
                    };
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Max salary</FieldLabel>
                        <Input
                          id={field.name}
                          inputMode="numeric"
                          placeholder={placeholders.max}
                          value={displayValue}
                          onBlur={field.handleBlur}
                          onChange={onChange}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field name="salaryCurrency">
                  {(field) => {
                    return (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Currency</FieldLabel>
                        <Select value={field.state.value} onValueChange={field.handleChange}>
                          <SelectTrigger id={field.name}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencyOptions.map((opt) => (
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
            );
          }}
        </form.Subscribe>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-base font-semibold tracking-tight">Team</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <form.Field name="teamSize" validators={{ onBlur: optionalPositiveInt }}>
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Team size</FieldLabel>
                  <Input
                    id={field.name}
                    inputMode="numeric"
                    placeholder="8"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
                    aria-invalid={isInvalid}
                  />
                  <p className="text-muted-foreground text-xs">Number of people on the team</p>
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="headcount" validators={{ onBlur: optionalPositiveInt }}>
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Open positions</FieldLabel>
                  <Input
                    id={field.name}
                    inputMode="numeric"
                    placeholder="1"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
                    aria-invalid={isInvalid}
                  />
                  <p className="text-muted-foreground text-xs">How many hires for this role</p>
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field
            name="finalReportTarget"
            validators={{
              onBlur: z
                .string()
                .refine(
                  (val) =>
                    Number.isInteger(Number(val)) &&
                    Number(val) >= (existingReportTarget ?? 1) &&
                    (Number(val) <= reportLimit || Number(val) === existingReportTarget),
                  {
                    message:
                      existingReportTarget !== null
                        ? `The target cannot be decreased and increases must be within your current plan (${reportTargetRangeLabel(reports)})`
                        : `Final report target must be between ${reportTargetRangeLabel(reports)} on your current plan`,
                  },
                ),
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Final report target</FieldLabel>
                  <Input
                    id={field.name}
                    inputMode="numeric"
                    min={existingReportTarget ?? 1}
                    max={targetAboveCurrentPlan ? existingReportTarget : reportLimit}
                    placeholder={String(reportLimit)}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
                    aria-invalid={isInvalid}
                  />
                  <p className="text-muted-foreground text-xs">
                    {targetAboveCurrentPlan
                      ? `Your existing target is above your current plan limit. You can keep it and edit other details, but must upgrade before increasing it.`
                      : `Targets can be increased but not decreased because candidate evaluations may already be underway. Your plan allows ${reportTargetRangeLabel(reports)}.`}
                  </p>
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>
        </div>
      </div>

      <div className="space-y-4">
        <form.Field name="status">
          {(field) => {
            return (
              <Field>
                <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                <Select value={field.state.value} onValueChange={field.handleChange}>
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        disabled={opt.value === "open" && openLocked}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {openLocked
                    ? "You've reached your active job limit. Save as a draft, or upgrade your plan to publish."
                    : 'Only "Open" jobs are visible to candidates.'}
                </p>
              </Field>
            );
          }}
        </form.Field>

        {!onCancel ? (
          <form.Subscribe selector={(state) => ({ values: state.values })}>
            {({ values }) => (
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isSubmittingProp} className="gap-2">
                  {isSubmittingProp ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      strokeWidth={2}
                      className="size-4 animate-spin"
                    />
                  ) : null}
                  {isSubmittingProp ? "Creating job" : submitLabel}
                </Button>
                {companyName ? (
                  <JobPreviewDialog
                    data={{
                      title: values.title,
                      description: values.description,
                      companyName,
                      location: values.location || null,
                      workplaceType: values.workplaceType || null,
                      employmentType: values.employmentType || null,
                      experienceLevel: values.experienceLevel || null,
                      salaryMin: values.salaryMin ? Number(values.salaryMin) : null,
                      salaryMax: values.salaryMax ? Number(values.salaryMax) : null,
                      salaryCurrency: values.salaryCurrency,
                      teamSize: values.teamSize ? Number(values.teamSize) : null,
                      headcount: values.headcount ? Number(values.headcount) : null,
                    }}
                  />
                ) : null}
              </div>
            )}
          </form.Subscribe>
        ) : null}
      </div>
    </form>
  );
}
