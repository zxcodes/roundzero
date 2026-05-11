import { Briefcase02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card } from "@/components/ui/card";
import type { JobTemplate } from "@/shared/job-templates";

interface TemplateCardProps {
  template: JobTemplate;
  onSelect: (template: JobTemplate) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <Card
      onClick={() => onSelect(template)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(template);
        }
      }}
      role="button"
      tabIndex={0}
      className="relative cursor-pointer p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:opacity-90"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 inline-flex items-center justify-center rounded-lg bg-blue-50 p-2">
          <HugeiconsIcon icon={Briefcase02Icon} className="size-6 text-blue-600" />
        </div>
        <h3 className="mb-2 font-semibold text-base">{template.title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{template.description}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {template.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
