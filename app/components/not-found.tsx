import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={2}
          className="text-muted-foreground size-8"
        />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Page not found</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}
