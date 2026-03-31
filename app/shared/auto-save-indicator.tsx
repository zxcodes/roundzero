import { Alert02Icon, CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSaveStatus() {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const setSaving = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("saving");
  };

  const setSaved = () => {
    setStatus("saved");
    timerRef.current = setTimeout(() => setStatus("idle"), 2000);
  };

  const setError = () => {
    setStatus("error");
    timerRef.current = setTimeout(() => setStatus("idle"), 4000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { status, setSaving, setSaved, setError };
}

export function AutoSaveIndicator({ status }: { status: AutoSaveStatus }) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === "saving" ? (
        <>
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-3.5 animate-spin" />
          <span>Saving...</span>
        </>
      ) : status === "saved" ? (
        <>
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className="size-3.5 text-emerald-500"
          />
          <span>Saved</span>
        </>
      ) : status === "error" ? (
        <>
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3.5 text-destructive" />
          <span>Failed to save</span>
        </>
      ) : null}
    </div>
  );
}
