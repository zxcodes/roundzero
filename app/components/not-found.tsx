import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="animate-fade-in-up flex min-h-svh flex-col items-center justify-center gap-5 p-6 text-center">
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
