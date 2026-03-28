import { Plus, X } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface JobFormData {
  title: string;
  description: string;
  requirements: string[];
  status: string;
}

export function JobForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: {
  defaultValues?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const statusId = useId();
  const requirementInputId = useId();

  const [requirements, setRequirements] = useState<string[]>(defaultValues?.requirements ?? []);
  const [requirementInput, setRequirementInput] = useState("");
  const [status, setStatus] = useState(defaultValues?.status ?? "draft");

  const onAddRequirement = () => {
    const trimmed = requirementInput.trim();
    if (trimmed && !requirements.includes(trimmed)) {
      setRequirements([...requirements, trimmed]);
      setRequirementInput("");
    }
  };

  const onRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddRequirement();
    }
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get("title") as string).trim();
    const description = (formData.get("description") as string).trim();

    onSubmit({
      title,
      description,
      requirements,
      status,
    });
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor={titleId}>Job title</Label>
        <Input
          id={titleId}
          name="title"
          placeholder="Senior Software Engineer"
          defaultValue={defaultValues?.title}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={descriptionId}>Description</Label>
        <Textarea
          id={descriptionId}
          name="description"
          placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
          defaultValue={defaultValues?.description}
          required
          maxLength={5000}
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={requirementInputId}>Requirements</Label>
        <div className="flex gap-2">
          <Input
            id={requirementInputId}
            placeholder="e.g. 3+ years React experience"
            value={requirementInput}
            onChange={(e) => setRequirementInput(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={200}
          />
          <Button type="button" variant="outline" size="icon" onClick={onAddRequirement}>
            <Plus className="size-4" />
          </Button>
        </div>
        {requirements.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {requirements.map((req, i) => (
              <li
                key={`${req}-${i}`}
                className="bg-muted flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm"
              >
                <span>{req}</span>
                <button
                  type="button"
                  onClick={() => onRemoveRequirement(i)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={statusId}>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id={statusId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Only &quot;Open&quot; jobs are visible to candidates.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
