import { createFileRoute } from "@tanstack/react-router";

import { SupportPage } from "@/features/support/components/support-page";
import { noindexHead } from "@/shared/seo";

export const Route = createFileRoute("/_authenticated/dashboard/support")({
  head: () => ({
    ...noindexHead(),
    meta: [
      { title: "Support | RoundZero" },
      {
        name: "description",
        content: "Contact the RoundZero support team via email.",
      },
    ],
  }),
  component: SupportRoute,
});

function SupportRoute() {
  const { isCompany } = Route.useRouteContext();

  return <SupportPage isCompany={isCompany} />;
}
