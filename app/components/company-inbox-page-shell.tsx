import { PageInlineStats } from "@/components/page-inline-stats";

export function CompanyInboxPageShell({
  title,
  description,
  statItems,
  headerAction,
  children,
}: {
  title: string;
  description: string;
  statItems: { value: number; label: string }[];
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>

        <PageInlineStats items={statItems} />

        {children}
      </section>
    </div>
  );
}
