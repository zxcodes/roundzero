import { Add01Icon, Calendar03Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
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
import { Textarea } from "@/components/ui/textarea";
import { JobPreviewDialog } from "@/features/jobs/components/job-preview-dialog";
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
  requirements: string[];
  interviewQuestions: string[];
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
  reportLimit: number;
  expiresAt: Date | null;
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
    description: requiredString(5000, "Job description is required"),
    requirements: z.array(z.string()),
    interviewQuestions: z.array(z.string()),
    status: z.enum(["draft", "open"]),
    location: z.string().max(200),
    workplaceType: z.string().min(1, "Workplace type is required"),
    employmentType: z.string().min(1, "Employment type is required"),
    experienceLevel: z.string().min(1, "Experience level is required"),
    salaryMin: optionalPositiveInt,
    salaryMax: optionalPositiveInt,
    salaryCurrency: z.string().min(1),
    teamSize: optionalPositiveInt,
    headcount: optionalPositiveInt,
    reportLimit: z
      .string()
      .refine((val) => Number.isInteger(Number(val)) && Number(val) >= 1 && Number(val) <= 10, {
        message: "Report limit must be between 1 and 10",
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

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
];
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

export function JobForm({
  defaultValues,
  onSubmit,
  submitLabel,
  companyName,
}: {
  defaultValues?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => void;
  submitLabel: string;
  companyName?: string;
}) {
  const [requirementInput, setRequirementInput] = useState("");
  const [interviewQuestionInput, setInterviewQuestionInput] = useState("");
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const form = useForm({
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
      reportLimit: defaultValues?.reportLimit != null ? String(defaultValues.reportLimit) : "5",
      expiresAt: defaultValues?.expiresAt ? defaultValues.expiresAt.toISOString().slice(0, 10) : "",
    },

    validators: { onSubmit: formSchema },
    canSubmitWhenInvalid: true,

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
        workplaceType: value.workplaceType as WorkplaceType,
        employmentType: value.employmentType as EmploymentType,
        experienceLevel: value.experienceLevel as ExperienceLevel,
        salaryMin: value.salaryMin ? Number(value.salaryMin) : null,
        salaryMax: value.salaryMax ? Number(value.salaryMax) : null,
        salaryCurrency: value.salaryCurrency,
        teamSize: value.teamSize ? Number(value.teamSize) : null,
        headcount: value.headcount ? Number(value.headcount) : null,
        reportLimit: Number(value.reportLimit),
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
            onBlur: requiredString(5000, "Job description is required"),
            onSubmit: requiredString(5000, "Job description is required"),
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Description <span className="text-destructive">*</span>
                </FieldLabel>
                <Textarea
                  id={field.name}
                  placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
                  required
                  maxLength={5000}
                  rows={6}
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
      </FieldGroup>

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
                field.handleChange(date ? date.toISOString().slice(0, 10) : "");
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
                </Field>
              );
            }}
          </form.Field>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Compensation</p>
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
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Team</p>
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
            name="reportLimit"
            validators={{
              onBlur: z
                .string()
                .refine(
                  (val) => Number.isInteger(Number(val)) && Number(val) >= 1 && Number(val) <= 10,
                  {
                    message: "Report limit must be between 1 and 10",
                  },
                ),
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Candidate-agent report limit</FieldLabel>
                  <Input
                    id={field.name}
                    inputMode="numeric"
                    placeholder="5"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
                    aria-invalid={isInvalid}
                  />
                  <p className="text-muted-foreground text-xs">
                    Maximum candidate-agent reports to generate for this job (1-10)
                  </p>
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>
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
              <Field>
                <FieldLabel>
                  Requirements <span className="text-destructive">*</span>
                </FieldLabel>
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
              </Field>
            );
          }}
        </form.Field>
      </div>

      <Separator />

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
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Only "Open" jobs are visible to candidates.
                </p>
              </Field>
            );
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({ isSubmitting: state.isSubmitting, values: state.values })}
        >
          {({ isSubmitting, values }) => (
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : submitLabel}
              </Button>
              {companyName ? (
                <JobPreviewDialog
                  data={{
                    title: values.title,
                    description: values.description,
                    requirements: values.requirements,
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
      </div>
    </form>
  );
}
