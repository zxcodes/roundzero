import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
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

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

// --- Field Components ---

function TextField({
  label,
  placeholder,
  required,
  maxLength,
  type = "text",
  description,
}: {
  label: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  type?: "text" | "url" | "email";
  description?: string;
}) {
  const field = useFieldContext<string>();
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        type={type}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}

function NumberField({
  label,
  placeholder,
  min,
  description,
}: {
  label: string;
  placeholder?: string;
  min?: number;
  description?: string;
}) {
  const field = useFieldContext<number | null>();
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        type="number"
        placeholder={placeholder}
        min={min}
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => {
          const parsed = Number.parseInt(e.target.value, 10);
          field.handleChange(Number.isNaN(parsed) ? null : parsed);
        }}
      />
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}

function TextareaField({
  label,
  placeholder,
  required,
  maxLength,
  rows,
  description,
}: {
  label: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  description?: string;
}) {
  const field = useFieldContext<string>();
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Textarea
        id={field.name}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        rows={rows}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}

function SelectField({
  label,
  placeholder,
  options,
  description,
}: {
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  description?: string;
}) {
  const field = useFieldContext<string>();
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
        <SelectTrigger id={field.name}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}

function SubmitButton({ label, submittingLabel }: { label: string; submittingLabel?: string }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (submittingLabel ?? "Saving...") : label}
        </Button>
      )}
    </form.Subscribe>
  );
}

// --- Form Hook ---

export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    NumberField,
    TextareaField,
    SelectField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
});
