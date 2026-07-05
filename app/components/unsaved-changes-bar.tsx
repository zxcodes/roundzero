import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ClientOnly } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export function UnsavedChangesBar({
  isDirty,
  isSubmitting,
  onDiscard,
  onSave,
}: {
  isDirty: boolean;
  isSubmitting: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  if (!isDirty) {
    return null;
  }

  return (
    <ClientOnly fallback={null}>
      {createPortal(
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-30 md:left-[calc(var(--sidebar-width)+1rem)] md:right-6 lg:left-[calc(var(--sidebar-width)+1.5rem)]">
          <div className="pointer-events-auto mx-auto flex w-full items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/92 px-4 py-3 shadow-[0_18px_48px_-24px_rgba(0,0,0,0.72)] backdrop-blur-xl">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Unsaved changes</p>
              <p className="text-xs text-muted-foreground">
                Your edits are local until you save them.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" disabled={isSubmitting} onClick={onDiscard}>
                Discard
              </Button>
              <Button disabled={isSubmitting} onClick={onSave}>
                {isSubmitting ? (
                  <>
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      strokeWidth={2}
                      className="size-4 animate-spin"
                    />
                    Saving
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </ClientOnly>
  );
}
