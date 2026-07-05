import { Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadCompanyLogo } from "@/features/companies/server/functions";
import { getPublicAssetUrl } from "@/shared/r2";
import { fileToBase64 } from "@/shared/resume";

function companyInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type CompanyLogoUploadFieldProps = {
  companyName: string;
  value: string | null | undefined;
  onUploaded: (logo: { logoKey: string }) => Promise<void> | void;
  description: string;
  error?: string | null;
  label?: string;
  onErrorChange?: (error: string | null) => void;
};

export function CompanyLogoUploadField({
  companyName,
  value,
  onUploaded,
  description,
  error = null,
  label = "Logo",
  onErrorChange,
}: CompanyLogoUploadFieldProps) {
  const id = useId();
  const [isUploading, setIsUploading] = useState(false);

  const uploadLogoFn = useServerFn(uploadCompanyLogo);
  const inputId = `company-logo-${id}`;
  const logoUrl = value ? getPublicAssetUrl(value) : null;

  const onLogoSelected = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      onErrorChange?.(null);
      setIsUploading(true);

      const fileBase64 = await fileToBase64(file);
      const result = await uploadLogoFn({
        data: {
          fileName: file.name,
          contentType: file.type as "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml",
          fileBase64,
        },
      });

      await onUploaded({ logoKey: result.logoKey });
      toast.success("Company logo uploaded", {
        style: { marginBottom: "4rem" },
      });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Failed to upload company logo";
      toast.error(message, {
        style: { marginBottom: "4rem" },
      });
    } finally {
      setIsUploading(false);
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
      <section className="flex flex-col gap-4 rounded-3xl border border-border/60 px-4 py-4 sm:flex-row sm:items-start">
        <label htmlFor={inputId} className="group relative block size-24 shrink-0 cursor-pointer">
          <Avatar className="size-24 rounded-2xl after:rounded-2xl">
            {logoUrl ? (
              <AvatarImage src={logoUrl} alt={companyName} className="rounded-2xl" />
            ) : null}
            <AvatarFallback className="rounded-2xl bg-muted text-sm font-semibold">
              {companyInitials(companyName)}
            </AvatarFallback>
          </Avatar>
          {logoUrl ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
              <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} className="size-4 text-foreground" />
            </div>
          ) : null}
          {isUploading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-background/70">
              <span className="text-xs font-medium tabular-nums text-foreground">Uploading...</span>
              <div className="w-3/4 overflow-hidden rounded-full bg-muted">
                <div className="h-1.5 w-full animate-pulse bg-primary" />
              </div>
            </div>
          ) : null}
        </label>

        <div className="min-w-0 flex-1 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{value ? "Company logo" : "Add company logo"}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="sm:shrink-0"
              disabled={isUploading}
            >
              <label htmlFor={inputId}>{value ? "Replace" : "Upload"}</label>
            </Button>
          </div>

          {isUploading ? (
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
      </section>
    </div>
  );
}
