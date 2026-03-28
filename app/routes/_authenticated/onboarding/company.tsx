import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCompany, getMyCompany } from "@/features/companies/server-fns";

export const Route = createFileRoute("/_authenticated/onboarding/company")({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== "company") {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getMyCompany(),
  component: CompanyOnboardingPage,
});

function CompanyOnboardingPage() {
  const existingCompany = Route.useLoaderData();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameId = useId();
  const descriptionId = useId();

  if (existingCompany) {
    router.navigate({ to: "/dashboard" });
    return null;
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCompany({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });
      await router.invalidate();
      await router.navigate({ to: "/dashboard" });
    } catch {
      toast.error("Failed to create company. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your company</CardTitle>
          <CardDescription>
            Set up your company profile to start posting jobs and reviewing candidates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={nameId}>Company name</Label>
              <Input id={nameId} name="name" placeholder="Acme Inc." required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={descriptionId}>
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id={descriptionId}
                name="description"
                placeholder="What does your company do?"
                maxLength={500}
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create company"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
