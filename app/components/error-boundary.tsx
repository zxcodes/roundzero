import { ArrowLeft, Warning } from "@phosphor-icons/react";
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
        <Warning className="text-destructive size-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => {
            router.invalidate();
          }}
        >
          Try again
        </Button>
        <Button asChild>
          <Link to="/dashboard">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
