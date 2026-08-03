import { Alert01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getJobImportMissingFields,
  getJobImportReviewState,
  type JobImportMapping,
} from "@/features/job-imports/readiness";
import type { JobImportItemResponse } from "@/features/job-imports/schemas";
import {
  employmentTypeLabels,
  employmentTypeSchema,
  experienceLevelLabels,
  experienceLevelSchema,
  workplaceTypeLabels,
  workplaceTypeSchema,
} from "@/shared/enums";

const options = <T extends string>(labels: Record<T, string>) =>
  Object.entries(labels) as Array<[T, string]>;

export function JobImportTable({
  items,
  mappings,
  selectedIds,
  onToggleItem,
  onToggleVisible,
  onPreview,
  onMappingChange,
  disabled,
}: {
  items: JobImportItemResponse[];
  mappings: Record<string, JobImportMapping>;
  selectedIds: Set<string>;
  onToggleItem: (id: string, checked: boolean) => void;
  onToggleVisible: (items: JobImportItemResponse[], checked: boolean) => void;
  onPreview: (id: string) => void;
  onMappingChange: (id: string, mapping: JobImportMapping) => void;
  disabled: boolean;
}) {
  const selectable = items.filter((item) => item.status === "ready");
  const selectedVisible = selectable.filter((item) => selectedIds.has(item.id)).length;
  const allVisibleSelected = selectable.length > 0 && selectedVisible === selectable.length;
  const headerChecked = allVisibleSelected ? true : selectedVisible > 0 ? "indeterminate" : false;
  const onHeaderCheckedChange = (checked: boolean | "indeterminate") =>
    onToggleVisible(selectable, checked === true);

  return (
    <ScrollArea className="h-[min(58vh,38rem)] rounded-2xl border">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={headerChecked}
                onCheckedChange={onHeaderCheckedChange}
                aria-label="Select visible jobs"
              />
            </TableHead>
            <TableHead className="min-w-60">Job</TableHead>
            <TableHead className="hidden min-w-40 lg:table-cell">Workplace</TableHead>
            <TableHead className="hidden min-w-40 lg:table-cell">Employment</TableHead>
            <TableHead className="hidden min-w-40 lg:table-cell">Seniority</TableHead>
            <TableHead className="min-w-36">Status</TableHead>
            <TableHead className="w-24 text-right">Preview</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <JobImportTableRow
              key={item.id}
              item={item}
              mapping={mappings[item.id]}
              selected={selectedIds.has(item.id)}
              onToggle={onToggleItem}
              onPreview={onPreview}
              onMappingChange={onMappingChange}
              disabled={disabled}
            />
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function JobImportTableRow({
  item,
  mapping,
  selected,
  onToggle,
  onPreview,
  onMappingChange,
  disabled,
}: {
  item: JobImportItemResponse;
  mapping: JobImportMapping | undefined;
  selected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onPreview: (id: string) => void;
  onMappingChange: (id: string, mapping: JobImportMapping) => void;
  disabled: boolean;
}) {
  const selectable = item.status === "ready";
  const missing = getJobImportMissingFields(mapping);
  const state = getJobImportReviewState(item, mapping);
  const onCheckedChange = (checked: boolean | "indeterminate") =>
    onToggle(item.id, checked === true);
  const onPreviewClick = () => onPreview(item.id);
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
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={onCheckedChange}
          disabled={!selectable || disabled}
          aria-label={`Select ${item.job.title}`}
        />
      </TableCell>
      <TableCell className="max-w-80 whitespace-normal">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium">{item.job.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {item.job.location || "Location not provided"}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <Select
          value={mapping?.workplaceType ?? ""}
          onValueChange={onWorkplaceChange}
          disabled={!selectable || disabled}
        >
          <SelectTrigger
            size="sm"
            aria-invalid={selectable && !mapping?.workplaceType}
            aria-label={`Workplace for ${item.job.title}`}
          >
            <SelectValue placeholder="Missing: workplace" />
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
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <Select
          value={mapping?.employmentType ?? ""}
          onValueChange={onEmploymentChange}
          disabled={!selectable || disabled}
        >
          <SelectTrigger
            size="sm"
            aria-invalid={selectable && !mapping?.employmentType}
            aria-label={`Employment type for ${item.job.title}`}
          >
            <SelectValue placeholder="Missing: employment" />
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
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <Select
            value={mapping?.experienceLevel ?? ""}
            onValueChange={onExperienceChange}
            disabled={!selectable || disabled}
          >
            <SelectTrigger
              size="sm"
              aria-invalid={selectable && !mapping?.experienceLevel}
              aria-label={`Seniority for ${item.job.title}`}
            >
              <SelectValue placeholder="Missing: seniority" />
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
          {item.inferredFields.includes("experienceLevel") ? (
            <Badge variant="secondary">Suggested</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <ReviewStateBadge state={state} missingCount={missing.length} />
        {item.error ? <p className="mt-1 max-w-52 text-xs text-destructive">{item.error}</p> : null}
        {item.status === "imported" && item.importedJobId ? (
          <Link
            to="/dashboard/job-applicants/$jobId"
            params={{ jobId: item.importedJobId }}
            search={{ tab: "posting" }}
            className="mt-1 block text-xs text-primary underline-offset-4 hover:underline"
          >
            Open imported draft
          </Link>
        ) : null}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={onPreviewClick}>
          <HugeiconsIcon icon={ViewIcon} strokeWidth={2} data-icon="inline-start" />
          <span className="hidden xl:inline">Preview</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ReviewStateBadge({
  state,
  missingCount,
}: {
  state: ReturnType<typeof getJobImportReviewState>;
  missingCount: number;
}) {
  if (state === "needs_review") {
    return (
      <Badge variant="destructive">
        <HugeiconsIcon icon={Alert01Icon} strokeWidth={2} data-icon="inline-start" />
        Needs {missingCount} {missingCount === 1 ? "detail" : "details"}
      </Badge>
    );
  }
  if (state === "duplicate") return <Badge variant="outline">Duplicate</Badge>;
  if (state === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (state === "imported") return <Badge variant="secondary">Imported</Badge>;
  return <Badge variant="secondary">Ready</Badge>;
}
