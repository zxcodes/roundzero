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
import { cn } from "@/lib/utils";

const { fieldContext, useFieldContext, formContext, useFormContext } = createFormHookContexts();

function getFieldErrorMessage(errors: unknown[]) {
  const firstError = errors[0];
  if (typeof firstError === "string") {
    return firstError;
  }
  if (
    firstError &&
    typeof firstError === "object" &&
    "message" in firstError &&
    typeof firstError.message === "string"
  ) {
    return firstError.message;
  }
  return null;
}

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
  const errorMessage = getFieldErrorMessage(field.state.meta.errors);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    field.handleChange(e.target.value);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        className={cn(errorMessage ? "border-destructive focus-visible:ring-destructive/20" : "")}
        aria-invalid={Boolean(errorMessage)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        type={type}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={onChange}
      />
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
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
  const errorMessage = getFieldErrorMessage(field.state.meta.errors);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(e.target.value, 10);
    field.handleChange(Number.isNaN(parsed) ? null : parsed);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        type="number"
        className={cn(errorMessage ? "border-destructive focus-visible:ring-destructive/20" : "")}
        aria-invalid={Boolean(errorMessage)}
        placeholder={placeholder}
        min={min}
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        onChange={onChange}
      />
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
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
  const errorMessage = getFieldErrorMessage(field.state.meta.errors);
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    field.handleChange(e.target.value);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Textarea
        id={field.name}
        className={cn(errorMessage ? "border-destructive focus-visible:ring-destructive/20" : "")}
        aria-invalid={Boolean(errorMessage)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        rows={rows}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={onChange}
      />
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
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
  const errorMessage = getFieldErrorMessage(field.state.meta.errors);
  const onValueChange = (value: string) => {
    field.handleChange(value);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{label}</Label>
      <Select value={field.state.value} onValueChange={onValueChange}>
        <SelectTrigger
          id={field.name}
          className={cn(errorMessage ? "border-destructive focus-visible:ring-destructive/20" : "")}
          aria-invalid={Boolean(errorMessage)}
        >
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
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
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
