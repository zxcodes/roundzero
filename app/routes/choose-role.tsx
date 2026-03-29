import { Building01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setRole } from "@/features/auth/server-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/choose-role")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: "/choose-role" } });
    }
    if (context.user.role) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ChooseRolePage,
});

function ChooseRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"company" | "candidate" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      await setRole({ data: { role: selectedRole } });
      await router.invalidate();
      await router.navigate({ to: "/dashboard" });
    } catch {
      toast.error("Failed to set role. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)/5%,transparent_70%)]" />

      <div className="animate-fade-in-up relative w-full max-w-lg space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <span className="text-lg font-bold text-primary-foreground">H</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">How will you use Hirely?</h1>
          <p className="text-sm text-muted-foreground">
            Choose your role to get started. This cannot be changed later.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setSelectedRole("company")}>
            <div
              className={cn(
                "rounded-xl border bg-card p-6 text-center ring-1 ring-foreground/[0.03] transition-all hover:border-primary/40 hover:shadow-sm",
                selectedRole === "company" &&
                  "border-primary bg-primary/5 ring-primary/20 shadow-sm shadow-primary/10",
              )}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-xl bg-muted transition-colors",
                    selectedRole === "company" && "bg-primary/10",
                  )}
                >
                  <HugeiconsIcon
                    icon={Building01Icon}
                    strokeWidth={2}
                    className={cn(
                      "size-6 text-muted-foreground transition-colors",
                      selectedRole === "company" && "text-primary",
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">Company</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Post jobs and review AI-generated candidate reports
                  </p>
                </div>
              </div>
            </div>
          </button>

          <button type="button" onClick={() => setSelectedRole("candidate")}>
            <div
              className={cn(
                "rounded-xl border bg-card p-6 text-center ring-1 ring-foreground/[0.03] transition-all hover:border-primary/40 hover:shadow-sm",
                selectedRole === "candidate" &&
                  "border-primary bg-primary/5 ring-primary/20 shadow-sm shadow-primary/10",
              )}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-xl bg-muted transition-colors",
                    selectedRole === "candidate" && "bg-primary/10",
                  )}
                >
                  <HugeiconsIcon
                    icon={UserIcon}
                    strokeWidth={2}
                    className={cn(
                      "size-6 text-muted-foreground transition-colors",
                      selectedRole === "candidate" && "text-primary",
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">Candidate</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Apply to jobs and complete AI-powered interviews
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>

        <Button
          size="lg"
          className="w-full"
          disabled={!selectedRole || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "Setting up..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
