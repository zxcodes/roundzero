import { Copy01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const SUPPORT_EMAIL = "support@roundzero.dev";

type SupportPageProps = {
  isCompany: boolean;
};

export function SupportPage({ isCompany }: SupportPageProps) {
  const onCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast.success("Support email copied");
    } catch {
      toast.error("Failed to copy email.");
    }
  };

  return (
    <div className="space-y-6 pb-28">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground">
          {isCompany
            ? "Email is our primary support channel for hiring teams. Whether you need help with billing, job postings, candidate reports, team access, integrations, or anything else you're running into — reach out and we'll get back to you."
            : "Email is our primary support channel. Reach out if you need help with applications, interviews, your profile, or anything else on RoundZero."}
        </p>
      </section>

      <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">Contact us</h2>
          <p className="text-sm text-muted-foreground">
            {isCompany
              ? "Include your company name and a short description of the issue so we can help faster."
              : "Include your name and a short description of the issue so we can help faster."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <HugeiconsIcon
              icon={Mail01Icon}
              strokeWidth={2}
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input value={SUPPORT_EMAIL} readOnly className="bg-muted pl-10 text-sm" />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onCopyEmail}>
            <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3.5" />
            Copy email
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={`mailto:${SUPPORT_EMAIL}`}>Send email</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
