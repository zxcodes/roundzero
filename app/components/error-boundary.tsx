import { Alert02Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
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

  return (
    <div className="animate-fade-in-up flex min-h-[50vh] flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-7 text-destructive" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight">Something went wrong</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            router.invalidate();
          }}
        >
          Try again
        </Button>
        <Button size="sm" asChild>
          <Link to="/dashboard">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
