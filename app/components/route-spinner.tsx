import { Skeleton } from "@/components/ui/skeleton";

export function RouteSpinner() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  );
}
