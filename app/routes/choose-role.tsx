import { Buildings, User } from "@phosphor-icons/react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">How will you use Hirely?</h1>
          <p className="text-muted-foreground">
            Choose your role to get started. This cannot be changed later.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setSelectedRole("company")}>
            <Card
              className={cn(
                "cursor-pointer transition-colors hover:border-primary",
                selectedRole === "company" && "border-primary bg-primary/5",
              )}
            >
              <div className="flex flex-col items-center gap-2 px-4 py-6">
                <Buildings weight="duotone" className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium">Company</p>
                <p className="text-xs text-muted-foreground">
                  Post jobs and review AI-generated candidate reports
                </p>
              </div>
            </Card>
          </button>

          <button type="button" onClick={() => setSelectedRole("candidate")}>
            <Card
              className={cn(
                "cursor-pointer transition-colors hover:border-primary",
                selectedRole === "candidate" && "border-primary bg-primary/5",
              )}
            >
              <div className="flex flex-col items-center gap-2 px-4 py-6">
                <User weight="duotone" className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium">Candidate</p>
                <p className="text-xs text-muted-foreground">
                  Apply to jobs and complete AI-powered interviews
                </p>
              </div>
            </Card>
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
