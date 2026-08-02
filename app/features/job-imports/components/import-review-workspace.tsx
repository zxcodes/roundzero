import {
  AiMagicIcon,
  ArrowLeft01Icon,
  InformationCircleIcon,
  Loading03Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { PageInlineStats } from "@/components/page-inline-stats";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobImportInspector } from "@/features/job-imports/components/job-import-inspector";
import { JobImportTable } from "@/features/job-imports/components/job-import-table";
import {
  filterJobImportItems,
  getJobImportMissingFields,
  getJobImportReadinessCounts,
  initialJobImportMappings,
  type JobImportMapping,
  type JobImportReviewFilter,
  summarizeJobImportSuggestions,
} from "@/features/job-imports/readiness";
import type { JobImportItemOverride, JobImportPreview } from "@/features/job-imports/schemas";
import {
  enrichSelectedJobImports,
  importSelectedJobs,
} from "@/features/job-imports/server/functions";
import {
  employmentTypeLabels,
  employmentTypeSchema,
  experienceLevelLabels,
  experienceLevelSchema,
  workplaceTypeLabels,
  workplaceTypeSchema,
} from "@/shared/enums";

import { ImportComplete } from "./import-complete";

type ImportResult = Awaited<ReturnType<typeof importSelectedJobs>>;
type SuggestionSummary = ReturnType<typeof summarizeJobImportSuggestions>;

const options = <T extends string>(labels: Record<T, string>) =>
  Object.entries(labels) as Array<[T, string]>;

export function ImportReviewWorkspace({ initialPreview }: { initialPreview: JobImportPreview }) {
  const [preview, setPreview] = useState(initialPreview);
  const importableItems = preview.items.filter((item) => item.status === "ready");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(importableItems.map((item) => item.id)),
  );
  const [mappings, setMappings] = useState(() => initialJobImportMappings(initialPreview));
  const [filter, setFilter] = useState<JobImportReviewFilter>("all");
  const [search, setSearch] = useState("");
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [suggestionSummary, setSuggestionSummary] = useState<SuggestionSummary | null>(null);
  const [bulkWorkplace, setBulkWorkplace] = useState("");
  const [bulkEmployment, setBulkEmployment] = useState("");
  const [bulkExperience, setBulkExperience] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const enrichFn = useServerFn(enrichSelectedJobImports);
  const importFn = useServerFn(importSelectedJobs);

  const counts = getJobImportReadinessCounts(preview.items, mappings);
  const filteredItems = filterJobImportItems({ items: preview.items, mappings, filter, search });
  const selectedItems = importableItems.filter((item) => selectedIds.has(item.id));
  const selectedNeedsReview = selectedItems.filter(
    (item) => getJobImportMissingFields(mappings[item.id]).length > 0,
  ).length;
  const suggestableItems = selectedItems.filter(
    (item) => item.job.requirements.length === 0 || !mappings[item.id]?.experienceLevel,
  );
  const inspectorItem = preview.items.find((item) => item.id === inspectorId) ?? null;

  const mutationError = (error: Error) => toast.error(error.message || "The import failed.");
  const enrichMutation = useMutation({
    mutationFn: enrichFn,
    onSuccess: (nextPreview) => {
      const summary = summarizeJobImportSuggestions({
        before: preview,
        after: nextPreview,
        selectedIds,
        mappings,
      });
      setPreview(nextPreview);
      setMappings((current) => {
        const next = { ...current };
        for (const item of nextPreview.items) {
          const existing = current[item.id];
          next[item.id] = {
            workplaceType: existing?.workplaceType ?? item.job.workplaceType,
            employmentType: existing?.employmentType ?? item.job.employmentType,
            experienceLevel: existing?.experienceLevel ?? item.job.experienceLevel,
          };
        }
        return next;
      });
      setSuggestionSummary(summary);
    },
    onError: mutationError,
  });
  const importMutation = useMutation({
    mutationFn: importFn,
    onSuccess: (nextResult) => {
      setResult(nextResult);
      toast.success(`${nextResult.imported.length} job drafts imported.`);
    },
    onError: mutationError,
  });

  const onSearchChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    setSearch(event.target.value);
  const onFilterChange = (value: string) => {
    if (value === "all" || value === "needs_review" || value === "ready" || value === "duplicate") {
      setFilter(value);
    }
  };
  const onToggleItem = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const onToggleVisible = (items: typeof preview.items, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const item of items) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };
  const onMappingChange = (id: string, mapping: JobImportMapping) => {
    setMappings((current) => ({ ...current, [id]: mapping }));
  };
  const applyBulkMapping = (update: Partial<JobImportMapping>) => {
    setMappings((current) => {
      const next = { ...current };
      for (const item of selectedItems) {
        next[item.id] = { ...current[item.id], ...update };
      }
      return next;
    });
  };
  const onBulkWorkplaceChange = (value: string) => {
    applyBulkMapping({ workplaceType: workplaceTypeSchema.parse(value) });
    setBulkWorkplace("");
  };
  const onBulkEmploymentChange = (value: string) => {
    applyBulkMapping({ employmentType: employmentTypeSchema.parse(value) });
    setBulkEmployment("");
  };
  const onBulkExperienceChange = (value: string) => {
    applyBulkMapping({ experienceLevel: experienceLevelSchema.parse(value) });
    setBulkExperience("");
  };
  const onSuggest = () => {
    if (suggestableItems.length === 0) return;
    setSuggestionSummary(null);
    enrichMutation.mutate({
      data: { batchId: preview.batchId, itemIds: suggestableItems.map((item) => item.id) },
    });
  };
  const onImport = () => {
    const items: JobImportItemOverride[] = selectedItems.map((item) => ({
      id: item.id,
      workplaceType: mappings[item.id]?.workplaceType ?? null,
      employmentType: mappings[item.id]?.employmentType ?? null,
      experienceLevel: mappings[item.id]?.experienceLevel ?? null,
    }));
    if (items.length === 0) return;
    importMutation.mutate({ data: { batchId: preview.batchId, items } });
  };
  const onPreview = (id: string) => setInspectorId(id);
  const onCloseInspector = () => setInspectorId(null);
  const onClearFilters = () => {
    setFilter("all");
    setSearch("");
  };

  if (result) return <ImportComplete result={result} />;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Button variant="ghost" size="sm" asChild className="-ml-3 self-start">
        <Link to="/dashboard/jobs/import" search={{}}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} data-icon="inline-start" />
          Choose another source
        </Link>
      </Button>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Review imported jobs</h1>
          <p className="text-sm text-muted-foreground">
            {preview.sourceLabel} · Review what needs attention, then import selected jobs as
            drafts.
          </p>
        </div>
        <Badge variant="outline">Drafts only</Badge>
      </div>

      <PageInlineStats
        items={[
          { value: counts.newJobs, label: "new jobs" },
          { value: counts.ready, label: "ready" },
          { value: counts.needsReview, label: "need review" },
          { value: counts.duplicates, label: "duplicates" },
        ]}
      />

      <div className="flex flex-col gap-3 rounded-2xl border p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-sm">
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={onSearchChange}
              placeholder="Search title or location"
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={onFilterChange}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="needs_review">Needs review ({counts.needsReview})</TabsTrigger>
              <TabsTrigger value="ready">Ready ({counts.ready})</TabsTrigger>
              <TabsTrigger value="duplicate">Duplicates ({counts.duplicates})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {selectedIds.size > 0 ? (
          <div className="flex flex-col gap-3 border-t pt-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Set for {selectedIds.size} selected:</span>
              <Select value={bulkWorkplace} onValueChange={onBulkWorkplaceChange}>
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue placeholder="Workplace" />
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
              <Select value={bulkEmployment} onValueChange={onBulkEmploymentChange}>
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue placeholder="Employment" />
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
              <Select value={bulkExperience} onValueChange={onBulkExperienceChange}>
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue placeholder="Seniority" />
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
            </div>
            <div className="flex flex-col items-start gap-1 xl:items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onSuggest}
                disabled={suggestableItems.length === 0 || enrichMutation.isPending}
              >
                {enrichMutation.isPending ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} data-icon="inline-start" />
                )}
                Suggest missing details
              </Button>
              <span className="text-xs text-muted-foreground">
                Uses source text to suggest requirements and seniority. Nothing is published.
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {enrichMutation.isPending ? (
        <Alert>
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" />
          <AlertTitle>Reviewing {suggestableItems.length} incomplete jobs…</AlertTitle>
          <AlertDescription>
            RoundZero is looking for supported requirements and seniority in each source posting.
          </AlertDescription>
        </Alert>
      ) : null}
      {suggestionSummary ? (
        <Alert>
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
          <AlertTitle>Suggestions added to {suggestionSummary.jobsChanged} jobs</AlertTitle>
          <AlertDescription>
            {suggestionSummary.fieldsSuggested} fields were suggested.{" "}
            {suggestionSummary.stillNeedAttention} selected jobs still need attention.
          </AlertDescription>
        </Alert>
      ) : null}

      {filteredItems.length > 0 ? (
        <JobImportTable
          items={filteredItems}
          mappings={mappings}
          selectedIds={selectedIds}
          onToggleItem={onToggleItem}
          onToggleVisible={onToggleVisible}
          onPreview={onPreview}
          onMappingChange={onMappingChange}
        />
      ) : (
        <Empty className="rounded-2xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No jobs match this view</EmptyTitle>
            <EmptyDescription>
              Clear the search and filters to see the full import.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {importableItems.length > 0 ? (
        <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {selectedItems.length} {selectedItems.length === 1 ? "draft" : "drafts"} selected
            </span>
            <span className="text-xs text-muted-foreground">
              {selectedNeedsReview > 0
                ? `${selectedNeedsReview} will need details before publishing.`
                : "All selected jobs have their core publishing details."}
            </span>
          </div>
          <Button
            onClick={onImport}
            disabled={selectedItems.length === 0 || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <HugeiconsIcon
                icon={Loading03Icon}
                strokeWidth={2}
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : null}
            Import {selectedItems.length} {selectedItems.length === 1 ? "draft" : "drafts"}
          </Button>
        </div>
      ) : null}

      <JobImportInspector
        item={inspectorItem}
        mapping={inspectorItem ? mappings[inspectorItem.id] : undefined}
        onClose={onCloseInspector}
        onMappingChange={onMappingChange}
      />
    </div>
  );
}
