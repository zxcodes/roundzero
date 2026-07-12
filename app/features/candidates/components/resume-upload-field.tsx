import { Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getResume, uploadResume } from "@/features/candidates/server/functions";
import { base64ToBlob, fileToBase64, getResumeDisplayName } from "@/shared/resume";

type ResumeUploadFieldProps = {
  value: string | null | undefined;
  onUploaded: (resume: { resumeKey: string }) => Promise<void> | void;
  description: string;
  error?: string | null;
  label?: string;
  details?: string | null;
  showViewButton?: boolean;
  onErrorChange?: (error: string | null) => void;
};

export function ResumeUploadField({
  value,
  onUploaded,
  description,
  error = null,
  label = "Resume",
  details = null,
  showViewButton = false,
  onErrorChange,
}: ResumeUploadFieldProps) {
  const id = useId();
  const [uploadedResume, setUploadedResume] = useState<{
    resumeKey: string;
    name: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadResumeFn = useServerFn(uploadResume);
  const getResumeFn = useServerFn(getResume);
  const inputId = `resume-${id}`;
  const uploadedResumeName =
    uploadedResume && uploadedResume.resumeKey === value ? uploadedResume.name : null;
  const displayName = uploadedResumeName ?? getResumeDisplayName(value) ?? "Resume on file";

  const onResumeSelected = async (file: File | null) => {
    if (!file) {
      return;
    }

    const previousDisplayName = displayName;

    try {
      onErrorChange?.(null);
      setUploadedResume({ resumeKey: "", name: file.name });
      setIsUploading(true);

      const fileBase64 = await fileToBase64(file);
      const result = await uploadResumeFn({
        data: {
          fileName: file.name,
          contentType: file.type as
            | "application/pdf"
            | "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          fileBase64,
        },
      });

      await onUploaded({ resumeKey: result.resumeKey });
      setUploadedResume({ resumeKey: result.resumeKey, name: file.name });
      toast.success("Resume uploaded", {
        style: { marginBottom: "4rem" },
      });
    } catch (uploadError) {
      setUploadedResume(
        value
          ? {
              resumeKey: value,
              name: previousDisplayName,
            }
          : null,
      );
      const message =
        uploadError instanceof Error ? uploadError.message : "Failed to upload resume";
      toast.error(message, {
        style: { marginBottom: "4rem" },
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onViewResume = async () => {
    if (!value) {
      return;
    }

    try {
      const result = await getResumeFn({
        data: { resumeKey: value },
      });

      const blob = base64ToBlob(result.base64, result.contentType);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to open resume. Please try again.", {
        style: { marginBottom: "4rem" },
      });
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void onResumeSelected(e.target.files?.[0] ?? null);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        onChange={onFileChange}
      />
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-background shadow-xs">
            <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{value ? "Replace resume" : "Choose resume file"}</p>
            <p className="text-xs text-muted-foreground">PDF or DOCX</p>
          </div>
        </div>
        <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium">
          Browse
        </span>
      </label>
      <p className="text-muted-foreground text-xs">{description}</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {isUploading ? (
        <div className="space-y-2 rounded-lg border px-3 py-2">
          <div className="flex items-center justify-between text-sm">
            <span>{uploadedResume?.name ?? "Uploading resume"}</span>
            <span className="text-muted-foreground">Uploading</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full animate-pulse bg-primary" />
          </div>
        </div>
      ) : null}
      {value ? (
        <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60">
              <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              {details ? <p className="text-xs text-muted-foreground">{details}</p> : null}
            </div>
          </div>
          {showViewButton ? (
            <Button type="button" variant="outline" size="sm" onClick={onViewResume}>
              View
            </Button>
          ) : (
            <span className="text-xs font-medium text-success">Uploaded</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
