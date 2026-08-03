import { Alert01Icon, Link04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
  EditableJobImportPayload,
  JobImportItemResponse,
} from "@/features/job-imports/schemas";
import {
  employmentTypeLabels,
  employmentTypeSchema,
  experienceLevelLabels,
  experienceLevelSchema,
  salaryCurrencyLabels,
  salaryCurrencySchema,
  workplaceTypeLabels,
  workplaceTypeSchema,
} from "@/shared/enums";

const options = <T extends string>(labels: Record<T, string>) =>
  Object.entries(labels) as Array<[T, string]>;
const dateInputValue = (value: string | null) => (value ? value.slice(0, 10) : "");
const nullablePositiveNumber = (value: string) => (value.trim() ? Number(value) : null);

export function JobImportInspector({
  item,
  disabled,
  saveStatus,
  onClose,
  onDirtyChange,
  onSave,
}: {
  item: JobImportItemResponse | null;
  disabled: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSave: (itemId: string, job: EditableJobImportPayload) => void;
}) {
  const id = useId();
  const [job, setJob] = useState<EditableJobImportPayload | null>(() =>
    item
      ? {
          title: item.job.title,
          description: item.job.description,
          requirements: item.job.requirements,
          location: item.job.location,
          workplaceType: item.job.workplaceType,
          employmentType: item.job.employmentType,
          experienceLevel: item.job.experienceLevel,
          salaryMin: item.job.salaryMin,
          salaryMax: item.job.salaryMax,
          salaryCurrency: item.job.salaryCurrency,
          headcount: item.job.headcount,
          expiresAt: item.job.expiresAt,
        }
      : null,
  );
  const [dirty, setDirty] = useState(false);
  const [requirements, setRequirements] = useState(() => item?.job.requirements.join("\n") ?? "");
  const onOpenChange = (open: boolean) => {
    if (open || saveStatus === "saving") return;
    if (dirty && item && job) {
      onSave(item.id, job);
      return;
    }
    onClose();
  };
  if (!item || !job) return null;

  const update = (change: Partial<EditableJobImportPayload>, save = false) => {
    const next = { ...job, ...change };
    setJob(next);
    setDirty(true);
    onDirtyChange(true);
    if (save) onSave(item.id, next);
  };
  const onTextChange = (
    field: "title" | "description" | "location",
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => update({ [field]: event.target.value || (field === "location" ? null : "") });
  const onTitleChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    onTextChange("title", event);
  const onDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) =>
    onTextChange("description", event);
  const onLocationChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    onTextChange("location", event);
  const onRequirementsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRequirements(event.target.value);
    update({
      requirements: event.target.value
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    });
  };
  const onBlur = () => {
    if (dirty) onSave(item.id, job);
  };
  const onWorkplaceChange = (value: string) =>
    update({ workplaceType: workplaceTypeSchema.parse(value) }, true);
  const onEmploymentChange = (value: string) =>
    update({ employmentType: employmentTypeSchema.parse(value) }, true);
  const onExperienceChange = (value: string) =>
    update({ experienceLevel: experienceLevelSchema.parse(value) }, true);
  const onCurrencyChange = (value: string) =>
    update({ salaryCurrency: salaryCurrencySchema.parse(value) }, true);
  const onSalaryMinChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    update({ salaryMin: nullablePositiveNumber(event.target.value) });
  const onSalaryMaxChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    update({ salaryMax: nullablePositiveNumber(event.target.value) });
  const onHeadcountChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    update({ headcount: nullablePositiveNumber(event.target.value) });
  const onExpiresChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    update({
      expiresAt: event.target.value
        ? new Date(`${event.target.value}T00:00:00.000Z`).toISOString()
        : null,
    });

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl" aria-busy={saveStatus === "saving"}>
        <SheetHeader>
          <SheetTitle>Edit imported job</SheetTitle>
          <SheetDescription>
            Changes are saved to this import before drafts are created.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-6 px-6 pb-6">
            <p className="text-sm" aria-live="polite">
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved"
                  ? "Saved"
                  : saveStatus === "error"
                    ? "Could not save. Fix the fields or try again; this editor will stay open."
                    : "Changes save when you leave a field."}
            </p>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
                <Input
                  id={`${id}-title`}
                  name="title"
                  autoComplete="off"
                  value={job.title}
                  onChange={onTitleChange}
                  onBlur={onBlur}
                  disabled={disabled}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
                <Textarea
                  id={`${id}-description`}
                  name="description"
                  autoComplete="off"
                  value={job.description}
                  onChange={onDescriptionChange}
                  onBlur={onBlur}
                  disabled={disabled}
                  className="min-h-36"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-requirements`}>Requirements (one per line)</FieldLabel>
                <Textarea
                  id={`${id}-requirements`}
                  name="requirements"
                  autoComplete="off"
                  value={requirements}
                  onChange={onRequirementsChange}
                  onBlur={onBlur}
                  disabled={disabled}
                  className="min-h-28"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-location`}>Location</FieldLabel>
                <Input
                  id={`${id}-location`}
                  name="location"
                  autoComplete="off"
                  placeholder="City, region, or country…"
                  value={job.location ?? ""}
                  onChange={onLocationChange}
                  onBlur={onBlur}
                  disabled={disabled}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <JobSelect
                  id={`${id}-workplace`}
                  label="Workplace"
                  value={job.workplaceType ?? ""}
                  labels={workplaceTypeLabels}
                  onChange={onWorkplaceChange}
                  disabled={disabled}
                />
                <JobSelect
                  id={`${id}-employment`}
                  label="Employment type"
                  value={job.employmentType ?? ""}
                  labels={employmentTypeLabels}
                  onChange={onEmploymentChange}
                  disabled={disabled}
                />
                <JobSelect
                  id={`${id}-seniority`}
                  label="Seniority"
                  value={job.experienceLevel ?? ""}
                  labels={experienceLevelLabels}
                  onChange={onExperienceChange}
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor={`${id}-salary-min`}>Salary minimum</FieldLabel>
                  <Input
                    id={`${id}-salary-min`}
                    name="salary-min"
                    inputMode="numeric"
                    autoComplete="off"
                    value={job.salaryMin ?? ""}
                    onChange={onSalaryMinChange}
                    onBlur={onBlur}
                    disabled={disabled}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-salary-max`}>Salary maximum</FieldLabel>
                  <Input
                    id={`${id}-salary-max`}
                    name="salary-max"
                    inputMode="numeric"
                    autoComplete="off"
                    value={job.salaryMax ?? ""}
                    onChange={onSalaryMaxChange}
                    onBlur={onBlur}
                    disabled={disabled}
                  />
                </Field>
                <JobSelect
                  id={`${id}-currency`}
                  label="Currency"
                  value={job.salaryCurrency}
                  labels={salaryCurrencyLabels}
                  onChange={onCurrencyChange}
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${id}-headcount`}>Headcount</FieldLabel>
                  <Input
                    id={`${id}-headcount`}
                    name="headcount"
                    inputMode="numeric"
                    autoComplete="off"
                    value={job.headcount ?? ""}
                    onChange={onHeadcountChange}
                    onBlur={onBlur}
                    disabled={disabled}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-expiry`}>Expiry date</FieldLabel>
                  <Input
                    id={`${id}-expiry`}
                    name="expiry"
                    type="date"
                    autoComplete="off"
                    value={dateInputValue(job.expiresAt)}
                    onChange={onExpiresChange}
                    onBlur={onBlur}
                    disabled={disabled}
                  />
                </Field>
              </div>
            </FieldGroup>
            {item.warnings.length ? (
              <Alert>
                <HugeiconsIcon icon={Alert01Icon} strokeWidth={2} aria-hidden="true" />
                <AlertTitle>Source details to review</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {item.warnings.map((warning) => (
                      <li key={`${warning.code}-${warning.field}`}>{warning.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
            {item.error ? (
              <Alert variant="destructive">
                <AlertTitle>Import failed</AlertTitle>
                <AlertDescription>{item.error}</AlertDescription>
              </Alert>
            ) : null}
            {item.job.sourceUrl ? (
              <Button variant="outline" size="sm" asChild className="self-start">
                <a href={item.job.sourceUrl} target="_blank" rel="noreferrer">
                  <HugeiconsIcon
                    icon={Link04Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                  Open source posting
                </a>
              </Button>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function JobSelect<T extends string>({
  id,
  label,
  value,
  labels,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  labels: Record<T, string>;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} aria-label={`${label} for imported job`}>
          <SelectValue placeholder={`Select ${label.toLowerCase()}…`} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options(labels).map(([option, optionLabel]) => (
              <SelectItem key={option} value={option}>
                {optionLabel}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
