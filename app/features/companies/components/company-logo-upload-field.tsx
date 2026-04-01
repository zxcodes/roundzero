import { Image02Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  createCompanyLogoUploadTarget,
  finalizeCompanyLogoUpload,
} from "@/features/companies/server/functions";
import { getCompanyLogoUrl } from "@/shared/company-logo";
import { uploadFileToSignedUrl } from "@/shared/resume";

type CompanyLogoUploadFieldProps = {
  value: string | null | undefined;
  onUploaded: (logo: { logoKey: string }) => Promise<void> | void;
  description: string;
  error?: string | null;
  label?: string;
  onErrorChange?: (error: string | null) => void;
};

export function CompanyLogoUploadField({
  value,
  onUploaded,
  description,
  error = null,
  label = "Logo",
  onErrorChange,
}: CompanyLogoUploadFieldProps) {
  const id = useId();
  const [uploadState, setUploadState] = useState<{
    status: "idle" | "uploading";
    progress: number;
  }>({ status: "idle", progress: 0 });

  const createUploadTargetFn = useServerFn(createCompanyLogoUploadTarget);
  const finalizeUploadFn = useServerFn(finalizeCompanyLogoUpload);
  const inputId = `company-logo-${id}`;
  const logoUrl = getCompanyLogoUrl(value);

  const onLogoSelected = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      onErrorChange?.(null);
      setUploadState({ status: "uploading", progress: 0 });

      const target = await createUploadTargetFn({
        data: {
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type as "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml",
        },
      });

      await uploadFileToSignedUrl({
        file,
        uploadUrl: target.uploadUrl,
        onProgress: (progress) => {
          setUploadState({ status: "uploading", progress });
        },
      });

      const finalized = await finalizeUploadFn({
        data: { logoKey: target.logoKey },
      });

      await onUploaded({ logoKey: finalized.logoKey });
      setUploadState({ status: "idle", progress: 100 });
      toast.success("Company logo uploaded");
    } catch (uploadError) {
      setUploadState({ status: "idle", progress: 0 });
      const message =
        uploadError instanceof Error ? uploadError.message : "Failed to upload company logo";
      toast.error(message);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onLogoSelected(e.target.files?.[0] ?? null);
  };

  return (
    <div className="space-y-3">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        id={inputId}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={onFileChange}
      />
      <div className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-4 sm:flex-row sm:items-start">
        <label
          htmlFor={inputId}
          className="group relative flex size-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 transition-colors hover:border-primary/40 hover:bg-muted/60"
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Company logo" className="size-full object-contain p-3" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-center">
              <HugeiconsIcon
                icon={Image02Icon}
                strokeWidth={1.75}
                className="size-5 text-primary/80"
              />
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Logo
              </span>
            </div>
          )}
          {uploadState.status === "uploading" ? (
            <div className="absolute inset-0 flex items-end bg-background/70 p-2">
              <div className="w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-1.5 bg-primary transition-all"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          ) : null}
        </label>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{value ? "Company logo" : "Add company logo"}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <label
              htmlFor={inputId}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary sm:shrink-0"
            >
              <span>{value ? "Replace" : "Upload"}</span>
            </label>
          </div>

          {uploadState.status === "uploading" ? (
            <div className="space-y-2 rounded-xl border bg-muted/25 px-3 py-2.5">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading company logo...</span>
                <span className="text-muted-foreground">{uploadState.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          ) : value ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={Upload04Icon}
                strokeWidth={2}
                className="size-3.5 text-primary"
              />
              <span>Visible across your public company profile and job surfaces</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1">Square works best</span>
              <span className="rounded-full bg-muted px-2.5 py-1">PNG, JPG, WEBP, or SVG</span>
            </div>
          )}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
