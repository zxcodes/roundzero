import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function ErrorBoundary({
  error,
}: {
  error: Error;
  info?: { componentStack: string };
  reset?: () => void;
}) {
  const router = useRouter();
  const onRetry = () => {
    router.invalidate();
  };

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-7 text-destructive" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold tracking-tight">Something went wrong</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
        <Button size="sm" asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
