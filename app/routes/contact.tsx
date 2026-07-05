import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, submitContactForm } from "@/features/contact/server/functions";
import { buildPageHead } from "@/shared/seo";

export const Route = createFileRoute("/contact")({
  head: () =>
    buildPageHead({
      title: "Contact | RoundZero",
      description: "Get in touch with the RoundZero team.",
      path: "/contact",
    }),
  component: ContactPage,
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      query: "",
    },
    onSubmit: async ({ value }) => {
      await submitContactForm({ data: value });
      setSubmitted(true);
    },
  });

  if (submitted) {
    return (
      <div className="calm flex min-h-svh flex-col bg-background text-foreground">
        <PublicHeader />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-6 py-24 text-center lg:px-10">
          <span className="eyebrow">Contact</span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Message sent</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Thanks for reaching out. We'll get back to you at{" "}
            <span className="text-foreground">{form.getFieldValue("email")}</span> as soon as
            possible.
          </p>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="calm flex min-h-svh flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto flex-1 w-full max-w-lg px-6 py-20 lg:px-10">
        <div className="text-center">
          <span className="eyebrow">Contact</span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Contact us</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Have a question or want to learn more? Send us a message and we'll get back to you.
          </p>
        </div>

        <form
          className="mt-10 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="email"
            validators={{
              onBlur: contactSchema.shape.email,
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    id={field.name}
                    type="email"
                    placeholder="you@example.com"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field
            name="query"
            validators={{
              onBlur: contactSchema.shape.query,
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Message</FieldLabel>
                  <Textarea
                    id={field.name}
                    placeholder="Tell us what you're looking for..."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                    className="max-h-48"
                  />
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                ) : null}
                {isSubmitting ? "Sending" : "Send message"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </main>
      <PublicFooter />
    </div>
  );
}
