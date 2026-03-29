import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="animate-fade-in-up flex min-h-[50vh] flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={2}
          className="size-7 text-muted-foreground"
        />
      </div>
      <div className="space-y-1.5">
        <p className="font-mono text-6xl font-bold tracking-tighter text-foreground/10">404</p>
        <h2 className="text-lg font-semibold tracking-tight">Page not found</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button size="sm" asChild>
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}
