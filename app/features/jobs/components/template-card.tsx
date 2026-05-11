import { Briefcase01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import type { JobTemplate } from "@/shared/job-templates";

interface TemplateCardProps {
  template: JobTemplate;
  onSelect: (template: JobTemplate) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="flex w-full items-start gap-4 rounded-lg border border-transparent p-4 text-left transition-colors hover:bg-muted/50 hover:border-border/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <HugeiconsIcon
          icon={Briefcase01Icon}
          strokeWidth={2}
          className="size-5 text-muted-foreground"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{template.title}</p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>

        {template.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}
