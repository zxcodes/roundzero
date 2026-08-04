import {
  ArrowLeft01Icon,
  Briefcase01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Link04Icon,
  Loading03Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JOB_IMPORT_CSV_TEMPLATE } from "@/features/job-imports/csv-template";
import type { JobImportPreview } from "@/features/job-imports/schemas";
import { previewJobsFromCsv, previewJobsFromUrl } from "@/features/job-imports/server/functions";

import { PlatformRequestDialog } from "./platform-request-dialog";

const supportedSources = [
  { name: "Greenhouse", method: "Careers page or job URL" },
  { name: "Lever", method: "Careers page or job URL" },
  { name: "Ashby", method: "Careers page or job URL" },
  { name: "Recruitee", method: "Careers page or job URL" },
  { name: "SmartRecruiters", method: "Careers page or job URL" },
  { name: "Other public sites", method: "Schema.org job URL" },
];

export function ImportSourcePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const previewUrlFn = useServerFn(previewJobsFromUrl);
  const previewCsvFn = useServerFn(previewJobsFromCsv);

  const onPreviewSuccess = async (preview: JobImportPreview) => {
    await router.navigate({
      to: "/dashboard/jobs/import",
      search: { batch: preview.batchId },
    });
    await router.invalidate();
  };
  const urlMutation = useMutation({
    mutationFn: previewUrlFn,
    onSuccess: onPreviewSuccess,
    onError: (error: Error) =>
      setUrlError(
        error.message || "We could not read that page. Check the URL or request support.",
      ),
  });
  const csvMutation = useMutation({
    mutationFn: previewCsvFn,
    onSuccess: onPreviewSuccess,
    onError: (error: Error) =>
      setCsvError(error.message || "We could not read this CSV. Check its columns and try again."),
  });

  const onUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
    setUrlError(null);
  };
  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setCsvError(null);
  };
  const onUrlSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUrlError(null);
    urlMutation.mutate({ data: { url } });
  };
  const onCsvSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setCsvError("Choose a CSV file first.");
      return;
    }
    if (file.size > 262_144) {
      setCsvError("This file is larger than 256 KB. Split it into a smaller CSV and try again.");
      return;
    }
    setCsvError(null);
    csvMutation.mutate({ data: { fileName: file.name, csv: await file.text() } });
  };
  const onDownloadTemplate = () => {
    const href = URL.createObjectURL(new Blob([JOB_IMPORT_CSV_TEMPLATE], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "roundzero-job-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="space-y-10 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Import jobs</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Bring your existing postings into RoundZero. Every imported job starts as a draft.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/jobs">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} data-icon="inline-start" />
            Back to jobs
          </Link>
        </Button>
      </div>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(24rem,0.85fr)]">
        <Card variant="bordered" className="h-full min-h-[32rem]">
          <CardHeader className="border-b border-border/60 px-5 py-5 md:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Choose where your jobs live</CardTitle>
                <CardDescription>
                  Connect a public careers page, a single job URL, or a CSV export.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1.5">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3.5" />
                No login required
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col px-5 py-6 md:px-6">
            <div className="mb-7 grid grid-cols-3 divide-x rounded-2xl bg-muted/40 px-2 py-3">
              {["Add a source", "Review jobs", "Import drafts"].map((label, index) => (
                <div key={label} className="flex items-center justify-center gap-2 px-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-semibold ring-1 ring-border/70">
                    {index + 1}
                  </span>
                  <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <Tabs defaultValue="url" className="flex flex-1 flex-col">
              <TabsList className="grid w-full grid-cols-2 sm:max-w-lg">
                <TabsTrigger value="url">Public URL</TabsTrigger>
                <TabsTrigger value="csv">CSV upload</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="flex-1 pt-7">
                <form onSubmit={onUrlSubmit} className="max-w-3xl">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="job-import-url">Careers page or job URL</FieldLabel>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id="job-import-url"
                          name="job-import-url"
                          autoComplete="off"
                          type="url"
                          required
                          value={url}
                          onChange={onUrlChange}
                          placeholder="https://jobs.lever.co/your-company…"
                          className="h-11 flex-1"
                        />
                        <Button
                          type="submit"
                          size="lg"
                          className="sm:min-w-40"
                          disabled={urlMutation.isPending || !url.trim()}
                          aria-busy={urlMutation.isPending}
                        >
                          {urlMutation.isPending ? (
                            <HugeiconsIcon
                              icon={Loading03Icon}
                              strokeWidth={2}
                              data-icon="inline-start"
                              className="animate-spin"
                            />
                          ) : (
                            <HugeiconsIcon
                              icon={Link04Icon}
                              strokeWidth={2}
                              data-icon="inline-start"
                            />
                          )}
                          {urlMutation.isPending ? "Reading page" : "Preview jobs"}
                        </Button>
                      </div>
                      {urlError ? (
                        <p className="text-sm text-destructive" role="alert">
                          {urlError}
                        </p>
                      ) : null}
                      <FieldDescription>
                        We detect the platform and show up to 50 jobs for review before saving
                        anything.
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                </form>
              </TabsContent>
              <TabsContent value="csv" className="flex-1 pt-7">
                <form onSubmit={onCsvSubmit} className="max-w-3xl">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="job-import-csv">Upload a CSV export</FieldLabel>
                      <input
                        id="job-import-csv"
                        name="job-import-csv"
                        type="file"
                        accept=".csv,text/csv"
                        onChange={onFileChange}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor="job-import-csv"
                        className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none transition-[color,box-shadow,background-color] peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/30"
                      >
                        <span className="font-medium">Choose file</span>
                        <span className="min-w-0 truncate text-muted-foreground">
                          {file ? file.name : "No file chosen"}
                        </span>
                      </label>
                      <FieldDescription>
                        Up to 50 jobs and 256 KB. Title and description are required.
                      </FieldDescription>
                      {csvError ? (
                        <p className="text-sm text-destructive" role="alert">
                          {csvError}
                        </p>
                      ) : null}
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        size="lg"
                        disabled={csvMutation.isPending || !file}
                        aria-busy={csvMutation.isPending}
                      >
                        {csvMutation.isPending ? (
                          <HugeiconsIcon
                            icon={Loading03Icon}
                            strokeWidth={2}
                            data-icon="inline-start"
                            className="animate-spin"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={Upload04Icon}
                            strokeWidth={2}
                            data-icon="inline-start"
                          />
                        )}
                        {csvMutation.isPending ? "Reading CSV" : "Preview CSV"}
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={onDownloadTemplate}
                      >
                        Download template
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="border-t border-border/60 bg-muted/20 px-5 py-4 md:px-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border/60">
                <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Job details only</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Candidates and applications remain in your existing hiring platform.
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>

        <Card variant="bordered" className="h-full min-h-[32rem]">
          <CardHeader className="border-b border-border/60 px-5 py-5 md:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Supported sources</CardTitle>
                <CardDescription>Import directly from these public job pages.</CardDescription>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-4.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col px-5 py-5 md:px-6">
            <div className="grid grid-cols-2 gap-2.5">
              {supportedSources.map((source) => (
                <div
                  key={source.name}
                  className="rounded-xl bg-muted/35 p-3.5 ring-1 ring-border/40"
                >
                  <p className="text-sm font-medium">{source.name}</p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{source.method}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl bg-muted/35 p-3.5 ring-1 ring-border/40">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} className="size-4" />
                <p className="text-sm font-medium">CSV</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a structured file with up to 50 jobs.
              </p>
            </div>

            <div className="mt-auto pt-5">
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                Don’t see your hiring platform? Tell us what to support next.
              </p>
              <PlatformRequestDialog />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
