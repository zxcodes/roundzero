import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type WorkflowStep = {
  title: string;
  description: string;
};

const companySteps: WorkflowStep[] = [
  {
    title: "Set up your company profile",
    description: "Tell candidates who you are and what makes your company a great place to work.",
  },
  {
    title: "Post or import your first job",
    description:
      "Create a role manually or use the Job Importer to bring in existing postings, then publish when ready.",
  },
  {
    title: "Wait for candidate reports",
    description:
      "As candidates apply, RoundZero automatically handles screening and interviews. There is nothing to schedule or manage.",
  },
  {
    title: "Get notified",
    description: "We notify your team as soon as candidate reports are ready to review.",
  },
  {
    title: "Review and take action",
    description:
      "Compare explainable reports, review the evidence, and shortlist or reject candidates.",
  },
];

const candidateSteps: WorkflowStep[] = [
  {
    title: "Set up your profile",
    description:
      "Upload your resume once. RoundZero turns it into a structured profile for matching and applications.",
  },
  {
    title: "Find relevant jobs",
    description: "Explore personalized matches or browse every open role on the platform.",
  },
  {
    title: "Apply",
    description: "Apply using your existing profile and resume without entering everything again.",
  },
  {
    title: "Interview if invited",
    description:
      "Complete a focused async text interview and short voice assessment. No scheduling required.",
  },
  {
    title: "Track what happens next",
    description:
      "Get notified and follow each application from your dashboard as companies respond.",
  },
];

export function WorkflowGuideDialog({
  open,
  onOpenChange,
  isCompany,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCompany: boolean;
}) {
  const steps = isCompany ? companySteps : candidateSteps;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-4 p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border/60 px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">
            {isCompany ? "How hiring works on RoundZero" : "How your job search works"}
          </DialogTitle>
          <DialogDescription>
            {isCompany
              ? "Post a role. RoundZero handles the first-round screening. You decide who moves forward."
              : "Build your profile once, apply to the right roles, and always know what happens next."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[min(58svh,26rem)] px-6">
          <ol className="py-2">
            {steps.map((step, index) => (
              <li key={step.title} className="relative flex gap-4 pb-6 last:pb-2">
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-9 bottom-1 left-[15px] w-px bg-border"
                  />
                ) : null}
                <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 pt-1">
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </ScrollArea>

        <DialogFooter className="border-t border-border/60 px-6 pt-4 pb-6">
          <DialogClose asChild>
            <Button>Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
