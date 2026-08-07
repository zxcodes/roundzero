import {
  AiMagicIcon,
  ArrowLeft01Icon,
  InformationCircleIcon,
  Loading03Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
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
import { companyBootstrapQueryKey } from "@/features/companies/server/functions";
import { JobImportInspector } from "@/features/job-imports/components/job-import-inspector";
import { JobImportTable } from "@/features/job-imports/components/job-import-table";
import {
  filterJobImportItems,
  getJobImportReadinessCounts,
  initialJobImportMappings,
  type JobImportMapping,
  type JobImportReviewFilter,
  summarizeJobImportSuggestions,
} from "@/features/job-imports/readiness";
import type { EditableJobImportPayload, JobImportPreview } from "@/features/job-imports/schemas";
import {
  enrichSelectedJobImports,
  getJobImportPreview,
  importSelectedJobs,
  saveJobImportItems,
} from "@/features/job-imports/server/functions";
import { getMissingRecommendedFields } from "@/features/jobs/publish-readiness";
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
type SaveStatus = "idle" | "saving" | "saved" | "error";
type PendingEdit = { id: string; job: EditableJobImportPayload };

const options = <T extends string>(labels: Record<T, string>) =>
  Object.entries(labels) as Array<[T, string]>;

export function ImportReviewWorkspace({ initialPreview }: { initialPreview: JobImportPreview }) {
  const queryClient = useQueryClient();
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inspectorDirty, setInspectorDirty] = useState(false);
  const previewRef = useRef(initialPreview);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingEditsRef = useRef(new Map<string, EditableJobImportPayload>());
  const saveDrainingRef = useRef(false);
  const saveFailedRef = useRef(false);
  const enrichFn = useServerFn(enrichSelectedJobImports);
  const loadPreviewFn = useServerFn(getJobImportPreview);
  const importFn = useServerFn(importSelectedJobs);
  const saveFn = useServerFn(saveJobImportItems);

  const hasUnsavedChanges = saveStatus === "saving" || saveStatus === "error" || inspectorDirty;
  useBlocker({
    shouldBlockFn: () =>
      !window.confirm("Some job import changes have not been saved. Leave and discard them?"),
    enableBeforeUnload: hasUnsavedChanges,
    disabled: !hasUnsavedChanges,
  });

  const counts = getJobImportReadinessCounts(preview.items, mappings);
  const filteredItems = filterJobImportItems({ items: preview.items, mappings, filter, search });
  const selectedItems = importableItems.filter((item) => selectedIds.has(item.id));
  const suggestableItems = selectedItems.filter((item) => !mappings[item.id]?.experienceLevel);
  const inspectorItem = preview.items.find((item) => item.id === inspectorId) ?? null;

  const mutationError = (error: Error) => toast.error(error.message || "The import failed.");
  const applyPreview = (nextPreview: JobImportPreview) => {
    previewRef.current = nextPreview;
    setPreview(nextPreview);
  };
  const enrichMutation = useMutation({
    mutationFn: enrichFn,
    onSuccess: (nextPreview) => {
      const summary = summarizeJobImportSuggestions({
        before: preview,
        after: nextPreview,
        selectedIds,
        mappings,
      });
      applyPreview(nextPreview);
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
    onSuccess: async (nextResult) => {
      setResult(nextResult);
      applyPreview(nextResult.preview);
      setMappings(initialJobImportMappings(nextResult.preview));
      setSelectedIds(
        new Set(
          nextResult.preview.items.filter((item) => item.status === "ready").map((item) => item.id),
        ),
      );
      if (nextResult.imported.length > 0) {
        await queryClient.invalidateQueries({ queryKey: companyBootstrapQueryKey });
      }
      toast.success(`${nextResult.imported.length} job drafts imported.`);
    },
    onError: mutationError,
  });
  const operationPending = enrichMutation.isPending || importMutation.isPending;

  const drainSaves = async () => {
    if (saveDrainingRef.current) return;
    saveDrainingRef.current = true;
    saveFailedRef.current = false;
    setSaveError(null);
    setSaveStatus("saving");
    while (pendingEditsRef.current.size > 0) {
      const pending = new Map(pendingEditsRef.current);
      pendingEditsRef.current.clear();
      try {
        const currentPreview = previewRef.current;
        const items = Array.from(pending, ([id, job]) => {
          const current = currentPreview.items.find((item) => item.id === id);
          if (!current || current.status !== "ready") {
            throw new Error("A job changed and can no longer be edited. Reload the saved import.");
          }
          return { id, job, expectedRevision: current.revision };
        });
        const nextPreview = await saveFn({
          data: { batchId: currentPreview.batchId, items },
        });
        previewRef.current = nextPreview;
      } catch (error) {
        for (const [id, job] of pending) {
          if (!pendingEditsRef.current.has(id)) pendingEditsRef.current.set(id, job);
        }
        saveFailedRef.current = true;
        setSaveError(error instanceof Error ? error.message : "These changes could not be saved.");
        setSaveStatus("error");
        saveDrainingRef.current = false;
        return;
      }
    }
    saveDrainingRef.current = false;
    applyPreview(previewRef.current);
    setMappings(initialJobImportMappings(previewRef.current));
    setInspectorDirty(false);
    setSaveStatus("saved");
  };
  const queueSave = (edits: PendingEdit[]) => {
    for (const edit of edits) pendingEditsRef.current.set(edit.id, edit.job);
    if (saveDrainingRef.current) {
      setSaveStatus("saving");
      return;
    }
    saveQueueRef.current = drainSaves();
  };

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
    const item = previewRef.current.items.find((candidate) => candidate.id === id);
    if (!item) return;
    queueSave([
      {
        id,
        job: {
          title: item.job.title,
          description: item.job.description,
          location: item.job.location,
          workplaceType: mapping.workplaceType,
          employmentType: mapping.employmentType,
          experienceLevel: mapping.experienceLevel,
          salaryMin: item.job.salaryMin,
          salaryMax: item.job.salaryMax,
          salaryCurrency: item.job.salaryCurrency,
          headcount: item.job.headcount,
          expiresAt: item.job.expiresAt,
        },
      },
    ]);
  };
  const onSave = (itemId: string, job: EditableJobImportPayload) => {
    queueSave([{ id: itemId, job }]);
  };
  const applyBulkMapping = (update: Partial<JobImportMapping>) => {
    const nextMappings = { ...mappings };
    const edits = selectedItems.map((item) => {
      const mapping = { ...mappings[item.id], ...update };
      nextMappings[item.id] = mapping;
      return {
        id: item.id,
        job: {
          title: item.job.title,
          description: item.job.description,
          location: item.job.location,
          workplaceType: mapping.workplaceType,
          employmentType: mapping.employmentType,
          experienceLevel: mapping.experienceLevel,
          salaryMin: item.job.salaryMin,
          salaryMax: item.job.salaryMax,
          salaryCurrency: item.job.salaryCurrency,
          headcount: item.job.headcount,
          expiresAt: item.job.expiresAt,
        },
      };
    });
    setMappings(nextMappings);
    queueSave(edits);
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
  const onImport = async () => {
    const itemIds = selectedItems.map((item) => item.id);
    if (itemIds.length === 0) return;
    await saveQueueRef.current;
    if (saveFailedRef.current || inspectorDirty) return;
    importMutation.mutate({ data: { batchId: preview.batchId, itemIds } });
  };
  const onPreview = (id: string) => setInspectorId(id);
  const onCloseInspector = () => setInspectorId(null);
  const onClearFilters = () => {
    setFilter("all");
    setSearch("");
  };
  const onRetrySave = () => {
    if (pendingEditsRef.current.size > 0) saveQueueRef.current = drainSaves();
  };
  const onReloadSaved = async () => {
    try {
      const nextPreview = await loadPreviewFn({ data: { batchId: preview.batchId } });
      if (!nextPreview) {
        setSaveError("This job import no longer exists.");
        return;
      }
      applyPreview(nextPreview);
      setMappings(initialJobImportMappings(nextPreview));
      setInspectorDirty(false);
      pendingEditsRef.current.clear();
      saveFailedRef.current = false;
      setSaveError(null);
      setSaveStatus("idle");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "The saved import could not be loaded.",
      );
    }
  };

  const durableResult: ImportResult = {
    imported: preview.items.flatMap((item) =>
      item.status === "imported" && item.importedJobId
        ? [
            {
              itemId: item.id,
              jobId: item.importedJobId,
              title: item.job.title,
              missingFields: getMissingRecommendedFields(item.job),
            },
          ]
        : [],
    ),
    skipped: preview.items.flatMap((item) =>
      item.status === "failed" || item.status === "duplicate"
        ? [
            {
              itemId: item.id,
              title: item.job.title,
              reason:
                item.error ??
                (item.status === "duplicate"
                  ? "This source job has already been imported."
                  : "Import failed."),
            },
          ]
        : [],
    ),
    preview,
  };
  if (preview.status === "completed") return <ImportComplete result={durableResult} />;

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
          <h1 className="text-xl font-semibold tracking-tight">Choose jobs to import</h1>
          <p className="text-sm text-muted-foreground">
            {preview.sourceLabel} · All selected jobs can be imported now. Nothing will be
            published.
          </p>
        </div>
        <Badge variant="outline">Drafts only</Badge>
      </div>

      <PageInlineStats
        items={[
          { value: counts.newJobs, label: "new jobs" },
          { value: selectedItems.length, label: "selected to import" },
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
              aria-label="Search imported jobs"
              name="job-import-search"
              autoComplete="off"
              value={search}
              onChange={onSearchChange}
              placeholder="Search title or location…"
              className="pl-9"
            />
          </div>
          <Tabs
            value={filter}
            onValueChange={onFilterChange}
            className="max-w-full overflow-x-auto"
          >
            <TabsList className="w-max">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="needs_review">Details later ({counts.needsReview})</TabsTrigger>
              <TabsTrigger value="ready">Publish-ready ({counts.ready})</TabsTrigger>
              <TabsTrigger value="duplicate">Duplicates ({counts.duplicates})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {selectedIds.size > 0 ? (
          <div className="flex flex-col gap-3 border-t pt-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                Optional details for {selectedIds.size} selected:
              </span>
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
                disabled={
                  suggestableItems.length === 0 ||
                  operationPending ||
                  saveStatus === "saving" ||
                  saveStatus === "error"
                }
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
                Suggest optional details
              </Button>
              <span className="text-xs text-muted-foreground">
                Uses source text to save work later. You can import without running this.
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
            RoundZero is looking for seniority signals in each source posting.
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
      {saveError ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Changes were not saved</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{saveError}</span>
            <span className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onRetrySave}>
                Try saving again
              </Button>
              <Button variant="ghost" size="sm" onClick={onReloadSaved}>
                Reload saved version
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      ) : null}
      {result ? (
        <Alert aria-live="polite">
          <AlertTitle>{result.imported.length} drafts imported</AlertTitle>
          <AlertDescription>
            <span>{importableItems.length} jobs remain ready for review. Imported drafts: </span>
            {result.imported.map((job, index) => (
              <span key={job.jobId}>
                {index > 0 ? ", " : null}
                <Link
                  to="/dashboard/job-applicants/$jobId"
                  params={{ jobId: job.jobId }}
                  search={{ tab: "posting" }}
                  className="font-medium underline underline-offset-4"
                >
                  {job.title}
                </Link>
              </span>
            ))}
            {result.skipped.map((job) => ` ${job.title ?? "Job"} — ${job.reason}`).join("")}
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
          disabled={operationPending || saveStatus === "saving" || saveStatus === "error"}
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
              Import now and complete any publishing details whenever you are ready.
            </span>
          </div>
          <Button
            onClick={onImport}
            disabled={
              selectedItems.length === 0 ||
              operationPending ||
              saveStatus === "saving" ||
              saveStatus === "error"
            }
            aria-busy={importMutation.isPending}
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
        key={inspectorItem ? `${inspectorItem.id}-${inspectorItem.revision}` : undefined}
        item={inspectorItem}
        disabled={operationPending || saveStatus === "saving"}
        saveStatus={saveStatus}
        onClose={onCloseInspector}
        onDirtyChange={setInspectorDirty}
        onSave={onSave}
      />
    </div>
  );
}
