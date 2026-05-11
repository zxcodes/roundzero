import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
          <DialogTitle>Start from a template</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {JOB_TEMPLATES.map((template) => (
              <TemplateCard key={template.id} template={template} onSelect={handleSelect} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
