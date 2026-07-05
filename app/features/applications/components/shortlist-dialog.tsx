import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type ReactNode, useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { shortlistApplicant } from "@/features/applications/server/functions";
import { MAX_SHORTLIST_NOTE_LENGTH } from "@/features/applications/shortlist";

const noteFieldSchema = z.string().max(MAX_SHORTLIST_NOTE_LENGTH, "Note is too long");

export function ShortlistDialog({
  applicationId,
  candidateName,
  mode,
  defaultNote,
  trigger,
}: {
  applicationId: string;
  candidateName: string;
  mode: "create" | "edit";
  defaultNote?: string | null;
  trigger: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const shortlistFn = useServerFn(shortlistApplicant);

  const mutation = useMutation({
    mutationFn: shortlistFn,
    onSuccess: async () => {
      toast.success(mode === "create" ? `${candidateName} shortlisted` : "Note updated");
      setOpen(false);
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong. Please try again.");
    },
  });

  const form = useForm({
    defaultValues: {
      note: defaultNote ?? "",
      notify: mode === "create",
    },
    onSubmit: ({ value }) => {
      mutation.mutate({
        data: {
          applicationId,
          note: value.note,
          notify: value.notify,
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? `Shortlist ${candidateName}` : "Edit note"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Optionally add a private note for the candidate. They'll be notified."
              : "Update the note the candidate sees. Choose whether to notify them again."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="space-y-4">
          <form.Field name="note" validators={{ onBlur: noteFieldSchema }}>
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`note-${id}`}>Note (optional)</FieldLabel>
                  <Textarea
                    id={`note-${id}`}
                    placeholder="e.g. Loved your interview — let's set up a call with the team."
                    rows={4}
                    maxLength={MAX_SHORTLIST_NOTE_LENGTH}
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

          {mode === "edit" ? (
            <form.Field name="notify">
              {(field) => (
                <Field orientation="horizontal">
                  <Checkbox
                    id={`notify-${id}`}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked === true)}
                  />
                  <FieldLabel htmlFor={`notify-${id}`} className="font-normal">
                    Notify the candidate of this update
                  </FieldLabel>
                </Field>
              )}
            </form.Field>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                  Saving
                </>
              ) : mode === "create" ? (
                "Shortlist candidate"
              ) : (
                "Save note"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
