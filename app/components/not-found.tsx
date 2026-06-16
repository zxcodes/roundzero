import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-7xl font-bold tracking-tighter text-foreground/40">404</p>
        <h2 className="font-heading text-lg font-medium tracking-tight">Page not found</h2>
        <p className="max-w-sm text-sm/relaxed text-muted-foreground w-72">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.history.back()}>
          Go back
        </Button>
        <Button size="sm" asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
