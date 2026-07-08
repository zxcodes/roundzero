import { useNavigate } from "@tanstack/react-router";
import type { ReportBatchNavigation } from "@/features/reports/components/report-page-ui";
import { useHotkey } from "@/shared/hotkeys";

/**
 * Keyboard shortcuts for the applicant report pages:
 * `S` shortlist, `R` reject, `←` previous, `→` next.
 * Each is gated on availability and, via the shared registry, is suppressed
 * while typing in a field or while a dialog/menu/listbox overlay is open.
 */
export function useReportKeyboardShortcuts({
  batchNavigation,
  linkTarget,
  onShortlist,
  onReject,
}: {
  batchNavigation: ReportBatchNavigation | null;
  linkTarget: "summary" | "full";
  onShortlist?: () => void;
  onReject?: () => void;
}) {
  const navigate = useNavigate();
  const to =
    linkTarget === "full"
      ? "/dashboard/applicant-reports/$applicationId/full"
      : "/dashboard/applicant-reports/$applicationId";

  const previousApplicationId = batchNavigation?.previousApplicationId ?? null;
  const nextApplicationId = batchNavigation?.nextApplicationId ?? null;

  useHotkey("S", () => onShortlist?.(), {
    enabled: Boolean(onShortlist),
    description: "Shortlist candidate",
    group: "Report",
  });

  useHotkey("R", () => onReject?.(), {
    enabled: Boolean(onReject),
    description: "Reject candidate",
    group: "Report",
  });

  useHotkey(
    "ArrowLeft",
    () => {
      if (previousApplicationId) {
        void navigate({ to, params: { applicationId: previousApplicationId } });
      }
    },
    {
      enabled: Boolean(previousApplicationId),
      description: "Previous candidate",
      group: "Report",
    },
  );

  useHotkey(
    "ArrowRight",
    () => {
      if (nextApplicationId) {
        void navigate({ to, params: { applicationId: nextApplicationId } });
      }
    },
    {
      enabled: Boolean(nextApplicationId),
      description: "Next candidate",
      group: "Report",
    },
  );
}
