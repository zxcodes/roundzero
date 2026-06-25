import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export function RoleAccordionPanel({
  jobId,
  jobTitle,
  count,
  countLabel,
  children,
}: {
  jobId: string;
  jobTitle: string;
  count: number;
  countLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Accordion type="multiple">
      <AccordionItem value={jobId}>
        <AccordionTrigger className="px-5 py-4 text-left hover:no-underline md:px-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 pr-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold tracking-tight">{jobTitle}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {count} {countLabel}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {count}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5 md:px-6">
          <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
            {children}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
