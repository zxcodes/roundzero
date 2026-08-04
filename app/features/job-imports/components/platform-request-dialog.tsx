import { Add01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { toast } from "sonner";

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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createFeedback } from "@/features/feedback/server/functions";

import { platformRequestFeedbackMessage, platformRequestSchema } from "../platform-request";

export function PlatformRequestDialog() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const createFeedbackFn = useServerFn(createFeedback);
  const mutation = useMutation({
    mutationFn: createFeedbackFn,
    onSuccess: () => {
      toast.success("Platform request sent");
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not send the request.");
    },
  });
  const form = useForm({
    defaultValues: { platform: "", careersUrl: "", notes: "" },
    validators: { onSubmit: platformRequestSchema },
    onSubmit: ({ value }) => {
      mutation.mutate({
        data: { type: "feature", message: platformRequestFeedbackMessage(value) },
      });
    },
  });

  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void form.handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
          Request a platform
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request an import platform</DialogTitle>
          <DialogDescription>
            Tell us which hiring platform you want RoundZero to support next.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onFormSubmit}>
          <FieldGroup>
            <form.Field name="platform">
              {(field) => {
                const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                const onChange = (event: React.ChangeEvent<HTMLInputElement>) =>
                  field.handleChange(event.target.value);
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor={`${id}-platform`}>Platform name</FieldLabel>
                    <Input
                      id={`${id}-platform`}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={onChange}
                      aria-invalid={invalid}
                      placeholder="Workable"
                    />
                    {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                );
              }}
            </form.Field>
            <form.Field name="careersUrl">
              {(field) => {
                const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                const onChange = (event: React.ChangeEvent<HTMLInputElement>) =>
                  field.handleChange(event.target.value);
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor={`${id}-url`}>Example careers URL</FieldLabel>
                    <Input
                      id={`${id}-url`}
                      type="url"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={onChange}
                      aria-invalid={invalid}
                      placeholder="https://company.example.com/careers"
                    />
                    {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                );
              }}
            </form.Field>
            <form.Field name="notes">
              {(field) => {
                const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) =>
                  field.handleChange(event.target.value);
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor={`${id}-notes`}>Notes</FieldLabel>
                    <Textarea
                      id={`${id}-notes`}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={onChange}
                      aria-invalid={invalid}
                      rows={3}
                      placeholder="Anything that would help us understand your workflow"
                    />
                    {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : null}
              Send request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
