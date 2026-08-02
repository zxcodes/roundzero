import {
  Alert01Icon,
  Briefcase01Icon,
  Link04Icon,
  Location01Icon,
  MoneyBag02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { JobImportMapping } from "@/features/job-imports/readiness";
import type { JobImportItemResponse } from "@/features/job-imports/schemas";
import {
  employmentTypeLabels,
  employmentTypeSchema,
  experienceLevelLabels,
  experienceLevelSchema,
  workplaceTypeLabels,
  workplaceTypeSchema,
} from "@/shared/enums";
import { formatSalaryFull } from "@/shared/format";

const options = <T extends string>(labels: Record<T, string>) =>
  Object.entries(labels) as Array<[T, string]>;

export function JobImportInspector({
  item,
  mapping,
  onClose,
  onMappingChange,
}: {
  item: JobImportItemResponse | null;
  mapping: JobImportMapping | undefined;
  onClose: () => void;
  onMappingChange: (id: string, mapping: JobImportMapping) => void;
}) {
  const id = useId();
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  if (!item) return null;

  const salary = formatSalaryFull(item.job.salaryMin, item.job.salaryMax, item.job.salaryCurrency);
  const onWorkplaceChange = (value: string) =>
    onMappingChange(item.id, {
      workplaceType: workplaceTypeSchema.parse(value),
      employmentType: mapping?.employmentType ?? null,
      experienceLevel: mapping?.experienceLevel ?? null,
    });
  const onEmploymentChange = (value: string) =>
    onMappingChange(item.id, {
      workplaceType: mapping?.workplaceType ?? null,
      employmentType: employmentTypeSchema.parse(value),
      experienceLevel: mapping?.experienceLevel ?? null,
    });
  const onExperienceChange = (value: string) =>
    onMappingChange(item.id, {
      workplaceType: mapping?.workplaceType ?? null,
      employmentType: mapping?.employmentType ?? null,
      experienceLevel: experienceLevelSchema.parse(value),
    });

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{item.job.title}</SheetTitle>
          <SheetDescription>
            Review the original posting and correct details before or after importing the draft.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-6 px-6 pb-6">
            <div className="flex flex-wrap gap-2">
              {item.job.location ? (
                <Badge variant="outline">
                  <HugeiconsIcon icon={Location01Icon} strokeWidth={2} data-icon="inline-start" />
                  {item.job.location}
                </Badge>
              ) : null}
              {salary ? (
                <Badge variant="outline">
                  <HugeiconsIcon icon={MoneyBag02Icon} strokeWidth={2} data-icon="inline-start" />
                  {salary}
                </Badge>
              ) : null}
              {item.job.headcount ? (
                <Badge variant="outline">
                  <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} data-icon="inline-start" />
                  {item.job.headcount} {item.job.headcount === 1 ? "opening" : "openings"}
                </Badge>
              ) : null}
            </div>

            <FieldGroup>
              <Field data-invalid={!mapping?.workplaceType}>
                <FieldLabel htmlFor={`${id}-workplace`}>Workplace</FieldLabel>
                <Select value={mapping?.workplaceType ?? ""} onValueChange={onWorkplaceChange}>
                  <SelectTrigger id={`${id}-workplace`} aria-invalid={!mapping?.workplaceType}>
                    <SelectValue placeholder="Select workplace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {options(workplaceTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={!mapping?.employmentType}>
                <FieldLabel htmlFor={`${id}-employment`}>Employment type</FieldLabel>
                <Select value={mapping?.employmentType ?? ""} onValueChange={onEmploymentChange}>
                  <SelectTrigger id={`${id}-employment`} aria-invalid={!mapping?.employmentType}>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {options(employmentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={!mapping?.experienceLevel}>
                <div className="flex items-center gap-2">
                  <FieldLabel htmlFor={`${id}-experience`}>Seniority</FieldLabel>
                  {item.inferredFields.includes("experienceLevel") ? (
                    <Badge variant="secondary">Suggested</Badge>
                  ) : null}
                </div>
                <Select value={mapping?.experienceLevel ?? ""} onValueChange={onExperienceChange}>
                  <SelectTrigger id={`${id}-experience`} aria-invalid={!mapping?.experienceLevel}>
                    <SelectValue placeholder="Select seniority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {options(experienceLevelLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            {item.warnings.length > 0 ? (
              <Alert>
                <HugeiconsIcon icon={Alert01Icon} strokeWidth={2} />
                <AlertTitle>Source details to review</AlertTitle>
                <AlertDescription>
                  <ul className="flex list-disc flex-col gap-1 pl-4">
                    {item.warnings.map((warning) => (
                      <li key={`${warning.code}-${warning.field}`}>{warning.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            <Separator />
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Description</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {item.job.description}
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Requirements</h3>
                {item.inferredFields.includes("requirements") ? (
                  <Badge variant="secondary">Suggested</Badge>
                ) : null}
              </div>
              {item.job.requirements.length > 0 ? (
                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed text-foreground/90">
                  {item.job.requirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No requirements were found.</p>
              )}
            </section>

            {item.job.sourceUrl ? (
              <Button variant="outline" size="sm" asChild className="self-start">
                <a href={item.job.sourceUrl} target="_blank" rel="noreferrer">
                  <HugeiconsIcon icon={Link04Icon} strokeWidth={2} data-icon="inline-start" />
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
