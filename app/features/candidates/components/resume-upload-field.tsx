import { Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createResumeUploadTarget,
  finalizeResumeUpload,
  getResumeDownloadUrl,
} from "@/features/candidates/server/functions";
import { getResumeDisplayName, uploadFileToSignedUrl } from "@/shared/resume";

type ResumeUploadFieldProps = {
  value: string | null | undefined;
  onUploaded: (resume: { resumeKey: string }) => Promise<void> | void;
  description: string;
  error?: string | null;
  label?: string;
  showViewButton?: boolean;
  onErrorChange?: (error: string | null) => void;
};

export function ResumeUploadField({
  value,
  onUploaded,
  description,
  error = null,
  label = "Resume",
  showViewButton = false,
  onErrorChange,
}: ResumeUploadFieldProps) {
  const id = useId();
  const [uploadedResumeName, setUploadedResumeName] = useState<string | null>(null);
  const [resumeUploadState, setResumeUploadState] = useState<{
    status: "idle" | "uploading" | "uploaded";
    progress: number;
  }>({
    status: "idle",
    progress: 0,
  });

  const createUploadTargetFn = useServerFn(createResumeUploadTarget);
  const finalizeResumeUploadFn = useServerFn(finalizeResumeUpload);
  const getResumeDownloadUrlFn = useServerFn(getResumeDownloadUrl);
  const inputId = `resume-${id}`;
  const displayName = uploadedResumeName ?? getResumeDisplayName(value) ?? "Resume on file";

  const onResumeSelected = async (file: File | null) => {
    if (!file) {
      return;
    }

    const previousDisplayName = displayName;

    try {
      onErrorChange?.(null);
      setUploadedResumeName(file.name);
      setResumeUploadState({ status: "uploading", progress: 0 });

      const target = await createUploadTargetFn({
        data: {
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type as
            | "application/pdf"
            | "application/msword"
            | "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      });

      await uploadFileToSignedUrl({
        file,
        uploadUrl: target.uploadUrl,
        onProgress: (progress) => {
          setResumeUploadState({ status: "uploading", progress });
        },
      });

      const finalized = await finalizeResumeUploadFn({
        data: { resumeKey: target.resumeKey },
      });

      await onUploaded({ resumeKey: finalized.resumeKey });
      setUploadedResumeName(file.name);
      setResumeUploadState({ status: "uploaded", progress: 100 });
      toast.success("Resume uploaded");
    } catch (error) {
      setUploadedResumeName(previousDisplayName);
      setResumeUploadState({ status: "idle", progress: 0 });
      const message = error instanceof Error ? error.message : "Failed to upload resume";
      toast.error(message);
    }
  };

  const onViewResume = async () => {
    if (!value) {
      return;
    }

    try {
      const result = await getResumeDownloadUrlFn({
        data: {
          resumeKey: value,
          fileName: displayName,
        },
      });

      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to open resume. Please try again.");
    }
  };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onResumeSelected(e.target.files?.[0] ?? null);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        onChange={onFileChange}
      />
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-background shadow-xs">
            <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{value ? "Replace resume" : "Choose resume file"}</p>
            <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX</p>
          </div>
        </div>
        <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium">
          Browse
        </span>
      </label>
      <p className="text-muted-foreground text-xs">{description}</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {resumeUploadState.status === "uploading" ? (
        <div className="space-y-2 rounded-lg border px-3 py-2">
          <div className="flex items-center justify-between text-sm">
            <span>{uploadedResumeName ?? "Uploading resume..."}</span>
            <span className="text-muted-foreground">{resumeUploadState.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${resumeUploadState.progress}%` }}
            />
          </div>
        </div>
      ) : null}
      {value ? (
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} className="size-4 text-primary" />
            <span>{displayName}</span>
          </div>
          {showViewButton ? (
            <Button type="button" variant="outline" size="sm" onClick={onViewResume}>
              View
            </Button>
          ) : (
            <span className="text-xs font-medium text-emerald-600">Uploaded</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
