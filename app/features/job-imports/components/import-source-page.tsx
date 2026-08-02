import {
  ArrowLeft01Icon,
  Briefcase01Icon,
  Link04Icon,
  Loading03Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  { name: "Other public sites", method: "One Schema.org job URL" },
  { name: "CSV", method: "File with up to 50 jobs" },
];

export function ImportSourcePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const previewUrlFn = useServerFn(previewJobsFromUrl);
  const previewCsvFn = useServerFn(previewJobsFromCsv);

  const onPreviewSuccess = async (preview: JobImportPreview) => {
    await router.navigate({
      to: "/dashboard/jobs/import",
      search: { batch: preview.batchId },
    });
    await router.invalidate();
  };
  const onPreviewError = (error: Error) => {
    toast.error(error.message || "Could not read jobs from that source.");
  };
  const urlMutation = useMutation({
    mutationFn: previewUrlFn,
    onSuccess: onPreviewSuccess,
    onError: onPreviewError,
  });
  const csvMutation = useMutation({
    mutationFn: previewCsvFn,
    onSuccess: onPreviewSuccess,
    onError: onPreviewError,
  });

  const onUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => setUrl(event.target.value);
  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    setFile(event.target.files?.[0] ?? null);
  const onUrlSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    urlMutation.mutate({ data: { url } });
  };
  const onCsvSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a CSV file first.");
      return;
    }
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
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-16">
      <Button variant="ghost" size="sm" asChild className="-ml-3 self-start">
        <Link to="/dashboard/jobs">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} data-icon="inline-start" />
          Back to jobs
        </Link>
      </Button>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Import jobs</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Bring your existing postings into RoundZero. Every imported job starts as a draft.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Choose your source</CardTitle>
            <CardDescription>
              Paste a public careers URL or upload a structured CSV file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="url">
              <TabsList>
                <TabsTrigger value="url">Careers page or job URL</TabsTrigger>
                <TabsTrigger value="csv">CSV file</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="pt-5">
                <form onSubmit={onUrlSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="job-import-url">Public URL</FieldLabel>
                      <Input
                        id="job-import-url"
                        type="url"
                        required
                        value={url}
                        onChange={onUrlChange}
                        placeholder="https://jobs.lever.co/your-company"
                      />
                      <FieldDescription>
                        We detect the platform and preview up to 50 jobs before importing anything.
                      </FieldDescription>
                    </Field>
                    <Button type="submit" disabled={urlMutation.isPending || !url.trim()}>
                      {urlMutation.isPending ? (
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          strokeWidth={2}
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : (
                        <HugeiconsIcon icon={Link04Icon} strokeWidth={2} data-icon="inline-start" />
                      )}
                      Preview jobs
                    </Button>
                  </FieldGroup>
                </form>
              </TabsContent>
              <TabsContent value="csv" className="pt-5">
                <form onSubmit={onCsvSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="job-import-csv">CSV file</FieldLabel>
                      <Input
                        id="job-import-csv"
                        type="file"
                        accept=".csv,text/csv"
                        onChange={onFileChange}
                      />
                      <FieldDescription>
                        Up to 50 jobs and 256 KB. Title and description are required.
                      </FieldDescription>
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={csvMutation.isPending || !file}>
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
                        Preview CSV
                      </Button>
                      <Button type="button" variant="outline" onClick={onDownloadTemplate}>
                        Download template
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle>Supported sources</CardTitle>
                <CardDescription>Public job data—no platform login required.</CardDescription>
              </div>
              <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="divide-y rounded-2xl border">
              {supportedSources.map((source) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <span className="text-sm font-medium">{source.name}</span>
                  <Badge variant="outline" className="max-w-44 truncate">
                    {source.method}
                  </Badge>
                </div>
              ))}
            </div>
            <PlatformRequestDialog />
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertTitle>What gets imported?</AlertTitle>
        <AlertDescription>
          RoundZero imports job details only. Candidates and applications stay in your existing
          platform.
        </AlertDescription>
      </Alert>
    </div>
  );
}
