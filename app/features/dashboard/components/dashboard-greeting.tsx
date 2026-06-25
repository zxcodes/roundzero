import { useHydrated } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function DashboardGreeting({ firstName }: { firstName: string }) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return <Skeleton className="h-9 w-72" />;
  }

  return (
    <h1 className="text-3xl font-semibold tracking-tight">
      {getTimeGreeting()} {firstName},
    </h1>
  );
}
