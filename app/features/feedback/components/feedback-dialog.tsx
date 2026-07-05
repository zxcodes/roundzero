import { ChatFeedback01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { createFeedback } from "@/features/feedback/server/functions";

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "general"], { message: "Please select a type" }),
  message: z.string().trim().min(1, "Feedback is required").max(2000, "Max 2000 characters"),
});

const typeOptions = [
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "general", label: "General feedback" },
];

export function FeedbackDialog() {
  const id = useId();
  const [open, setOpen] = useState(false);

  const createFeedbackFn = useServerFn(createFeedback);
  const mutation = useMutation({
    mutationFn: createFeedbackFn,
    onSuccess: () => {
      toast.success("Feedback sent. Thanks!");
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error("Failed to send feedback.");
    },
  });

  const form = useForm({
    defaultValues: {
      type: "" as "bug" | "feature" | "general" | "",
      message: "",
    },
    validators: {
      onSubmit: feedbackSchema,
    },
    onSubmit: ({ value }) => {
      mutation.mutate({
        data: {
          type: value.type as "bug" | "feature" | "general",
          message: value.message,
        },
      });
    },
  });

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button type="button">
                <HugeiconsIcon icon={ChatFeedback01Icon} strokeWidth={2} className="size-4" />
                <span>Send Feedback</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>Help us improve RoundZero.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onFormSubmit} className="space-y-4">
          <form.Field
            name="type"
            validators={{
              onChange: feedbackSchema.shape.type,
              onSubmit: feedbackSchema.shape.type,
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              const onTypeChange = (val: string) =>
                field.handleChange(val as typeof field.state.value);
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`type-${id}`}>
                    Type <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select value={field.state.value} onValueChange={onTypeChange}>
                    <SelectTrigger id={`type-${id}`} aria-invalid={isInvalid}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field
            name="message"
            validators={{
              onBlur: feedbackSchema.shape.message,
              onSubmit: feedbackSchema.shape.message,
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`message-${id}`}>
                    Message <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Textarea
                    id={`message-${id}`}
                    placeholder="Tell us what's on your mind..."
                    rows={4}
                    maxLength={2000}
                    className="max-h-48"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="mr-2 size-4 animate-spin"
                  />
                  Sending
                </>
              ) : (
                "Send feedback"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
