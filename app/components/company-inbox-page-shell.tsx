import { PageInlineStats } from "@/components/page-inline-stats";

export function CompanyInboxPageShell({
  title,
  description,
  statItems,
  children,
}: {
  title: string;
  description: string;
  statItems: { value: number; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>

        <PageInlineStats items={statItems} />

        {children}
      </section>
    </div>
  );
}
