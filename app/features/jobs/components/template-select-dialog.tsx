import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JOB_TEMPLATES, type JobTemplate } from "@/shared/job-templates";
import { TemplateCard } from "./template-card";

interface TemplateSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: JobTemplate) => void;
}

export function TemplateSelectDialog({ isOpen, onClose, onSelect }: TemplateSelectDialogProps) {
  const handleSelect = (template: JobTemplate) => {
    onSelect(template);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[min(90vw,1200px)] !max-w-none !gap-0 !p-0 !h-[90vh] flex flex-col">
        <div className="border-b px-6 py-6 shrink-0">
          <DialogTitle>Start from a template</DialogTitle>
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {JOB_TEMPLATES.map((template) => (
              <TemplateCard key={template.id} template={template} onSelect={handleSelect} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
