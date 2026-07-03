import type { AppBreadcrumbItem } from "@/components/app-breadcrumbs";

export function resolveAdminBreadcrumbs(routeId: string): AppBreadcrumbItem[] {
  if (routeId === "/admin/feedback") {
    return [{ label: "Metrics", to: "/admin" }, { label: "Feedback" }];
  }

  return [{ label: "Metrics" }];
}
