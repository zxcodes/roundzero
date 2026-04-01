import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

const emptyToNull = <T,>(value: T | ""): T | null => (value === "" ? null : value);

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

  const form = useAppForm({
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      requirements: defaultValues?.requirements ?? ([] as string[]),
      status: defaultValues?.status ?? ("draft" as string),
      location: defaultValues?.location ?? "",
      workplaceType: (defaultValues?.workplaceType ?? "") as string,
      employmentType: (defaultValues?.employmentType ?? "") as string,
      experienceLevel: (defaultValues?.experienceLevel ?? "") as string,
      salaryMin: defaultValues?.salaryMin ?? null,
      salaryMax: defaultValues?.salaryMax ?? null,
      salaryCurrency: defaultValues?.salaryCurrency ?? "USD",
      teamSize: defaultValues?.teamSize ?? null,
      headcount: defaultValues?.headcount ?? null,
    },
    onSubmit: ({ value }) => {
      onSubmit({
        title: value.title,
        description: value.description,
        requirements: value.requirements,
        status: value.status as JobStatus,
        location: value.location || null,
        workplaceType: emptyToNull(value.workplaceType) as WorkplaceType | null,
        employmentType: emptyToNull(value.employmentType) as EmploymentType | null,
        experienceLevel: emptyToNull(value.experienceLevel) as ExperienceLevel | null,
        salaryMin: value.salaryMin,
        salaryMax: value.salaryMax,
        salaryCurrency: value.salaryCurrency,
        teamSize: value.teamSize,
        headcount: value.headcount,
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

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="space-y-4">
        <form.AppField
          name="title"
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

      {/* Job metadata */}
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
        </div>
      </div>

      <Separator />

      {/* Compensation */}
      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Compensation</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <form.AppField
            name="salaryMin"
            children={(field) => (
              <field.NumberField label="Min salary" placeholder="120000" min={0} />
            )}
          />
          <form.AppField
            name="salaryMax"
            children={(field) => (
              <field.NumberField label="Max salary" placeholder="180000" min={0} />
            )}
          />
          <form.AppField
            name="salaryCurrency"
            children={(field) => <field.SelectField label="Currency" options={currencyOptions} />}
          />
        </div>
      </div>

      <Separator />

      {/* Team info */}
      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Team</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.AppField
            name="teamSize"
            children={(field) => (
              <field.NumberField
                label="Team size"
                placeholder="8"
                min={1}
                description="Number of people on the team"
              />
            )}
          />
          <form.AppField
            name="headcount"
            children={(field) => (
              <field.NumberField
                label="Open positions"
                placeholder="1"
                min={1}
                description="How many hires for this role"
              />
            )}
          />
        </div>
      </div>

      <Separator />

      {/* Requirements */}
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
            const onRemoveRequirement = (index: number) => {
              reqField.removeValue(index);
            };

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
                    {reqField.state.value.map((req, i) =>
                      (() => {
                        const onRemoveRequirementClick = () => {
                          onRemoveRequirement(i);
                        };

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
                              onClick={onRemoveRequirementClick}
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
                      })(),
                    )}
                  </ul>
                ) : null}
              </div>
            );
          }}
        </form.Field>
      </div>

      <Separator />

      {/* Status + Submit */}
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
