import { Edit02Icon, Image02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  createCompanyLogoUploadTarget,
  finalizeCompanyLogoUpload,
} from "@/features/companies/server/functions";
import { getPublicAssetUrl } from "@/shared/r2";
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
  const logoUrl = value ? getPublicAssetUrl(value) : null;

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
      toast.success("Company logo uploaded", {
        style: { marginBottom: "4rem" },
      });
    } catch (uploadError) {
      setUploadState({ status: "idle", progress: 0 });
      const message =
        uploadError instanceof Error ? uploadError.message : "Failed to upload company logo";
      toast.error(message, {
        style: { marginBottom: "4rem" },
      });
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void onLogoSelected(e.target.files?.[0] ?? null);
  };

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        id={inputId}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={onFileChange}
      />
      <Card className="bg-card/80 py-0">
        <CardContent className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start">
          <label
            htmlFor={inputId}
            className="group relative flex size-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 transition-colors hover:border-primary/40 hover:bg-muted/60"
          >
            {logoUrl ? (
              <>
                <img src={logoUrl} alt="Company logo" className="size-full object-contain p-3" />
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <HugeiconsIcon
                    icon={Edit02Icon}
                    strokeWidth={2}
                    className="size-4 text-foreground"
                  />
                </div>
              </>
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/70">
                <span className="text-xs font-medium tabular-nums text-foreground">
                  {uploadState.progress}%
                </span>
                <div className="w-3/4 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-1.5 bg-primary transition-all"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </label>

          <div className="min-w-0 flex-1 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {value ? "Company logo" : "Add company logo"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="sm:shrink-0"
                disabled={uploadState.status === "uploading"}
              >
                <label htmlFor={inputId}>{value ? "Replace" : "Upload"}</label>
              </Button>
            </div>

            {uploadState.status === "uploading" ? (
              <p className="text-xs text-muted-foreground">Uploading company logo...</p>
            ) : value ? (
              <p className="text-xs text-muted-foreground">
                Visible across your public company profile and job surfaces
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Square works best · PNG, JPG, WEBP, or SVG
              </p>
            )}

            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
