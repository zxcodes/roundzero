import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JOB_TEMPLATES, type JobTemplate } from "@/shared/job-templates";
import { TemplateCard } from "./template-card";

interface TemplateSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: JobTemplate) => void;
}

export function TemplateSelectDialog({ isOpen, onClose, onSelect }: TemplateSelectDialogProps) {
  const titleId = useId();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? JOB_TEMPLATES.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    : JOB_TEMPLATES;

  const onTemplateSelect = (template: JobTemplate) => {
    onSelect(template);
    onClose();
  };

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle id={titleId}>Start from a template</DialogTitle>
          <DialogDescription>Choose a template and customize it to your needs.</DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b px-6 pb-4">
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search templates..."
              value={query}
              onChange={onSearchChange}
              className="pl-9"
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "template" : "templates"}
          </p>
        </div>

        <ScrollArea className="h-[55vh] min-h-75">
          <div className="space-y-1 p-4">
            {filtered.length > 0 ? (
              filtered.map((template) => (
                <TemplateCard key={template.id} template={template} onSelect={onTemplateSelect} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">No templates match your search.</p>
                <p className="text-xs text-muted-foreground">Try a different keyword.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
