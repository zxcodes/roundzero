import { useHydrated } from "@tanstack/react-router";

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

  // The time-of-day prefix depends on the viewer's local clock, so it can't be
  // rendered on the server without risking a hydration mismatch. Render the name
  // immediately (stable across server/client) and prepend the greeting once
  // hydrated — no skeleton, no flash.
  return (
    <h1 className="text-xl font-semibold tracking-tight">
      {hydrated ? `${getTimeGreeting()} ` : ""}
      {firstName},
    </h1>
  );
}
