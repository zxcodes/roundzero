import { AiMagicIcon, Loading03Icon, RefreshIcon, Rocket01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FREE_REPORT_DEFAULTS } from "@/features/entitlements/entitlements";
import { useEntitlements } from "@/features/entitlements/hooks/use-entitlements";
import type { JobFormData } from "@/features/jobs/components/job-form";
import type { AiJobGenerationOutput } from "@/features/jobs/schemas";
import { generateJobWithAI } from "@/features/jobs/server/functions";
import { cn } from "@/lib/utils";
import {
  employmentTypeLabels,
  experienceLevelLabels,
  salaryCurrencyLabels,
  workplaceTypeLabels,
} from "@/shared/enums";
import { formatSalary } from "@/shared/format";

interface AiJobCreatorProps {
  isPaid: boolean;
  onApply: (data: JobFormData) => void;
  onDiscard: () => void;
}

export function AiJobCreator({ isPaid, onApply, onDiscard }: AiJobCreatorProps) {
  const entitlements = useEntitlements();
  const reports = entitlements?.reports ?? FREE_REPORT_DEFAULTS;

  const mapAiOutputToFormData = (output: AiJobGenerationOutput): JobFormData => {
    return {
      ...output,
      status: "draft",
      expiresAt: null,
      finalReportTarget: reports.defaultTarget,
      location: output.location ?? null,
      salaryMin: output.salaryMin ?? null,
      salaryMax: output.salaryMax ?? null,
      teamSize: output.teamSize ?? null,
      headcount: output.headcount ?? null,
    };
  };
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<AiJobGenerationOutput | null>(null);

  const generateFn = useServerFn(generateJobWithAI);
  const generateMutation = useMutation({
    mutationFn: generateFn,
    onSuccess: (data) => {
      setResult(data);
      toast.success("Job draft generated");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong while generating your job posting. Please try again.",
      );
    },
  });

  const onPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const onGenerate = () => {
    if (!prompt.trim()) return;
    generateMutation.mutate({ data: { prompt: prompt.trim() } });
  };

  const onTryAgain = () => {
    setResult(null);
    onDiscard();
  };

  const onUseDraft = () => {
    if (result) {
      onApply(mapAiOutputToFormData(result));
      toast.success("Draft applied to the form below");
    }
  };

  const isGenerating = generateMutation.isPending;

  return (
    <section
      className={cn(
        "relative space-y-4 overflow-hidden rounded-3xl border px-5 py-4 md:px-6",
        "border-primary/15 bg-muted-foreground/4.5 shadow-sm shadow-primary/4 dark:bg-muted/10",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/25 to-transparent"
      />
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} className="size-5 text-primary" />
          <h2 className="text-base font-semibold tracking-tight">Create with AI</h2>
          {isPaid ? (
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
              Included
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
              Paid plans
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Describe the role in a few sentences and we will build the posting for you.
        </p>
      </div>

      {!result ? (
        <div className="space-y-3">
          <Textarea
            placeholder="e.g. Senior React frontend engineer with 5+ years experience, remote-friendly, $120-160k, working on a design system..."
            value={prompt}
            onChange={onPromptChange}
            rows={3}
            maxLength={500}
            disabled={!isPaid || isGenerating}
          />
          {isPaid ? (
            <Button
              onClick={onGenerate}
              disabled={isGenerating || prompt.trim().length < 10}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                  Generating
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} className="size-4" />
                  Generate job posting
                </>
              )}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled className="gap-2">
                  <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} className="size-4" />
                  Generate job posting
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI job creation is available on paid plans. Upgrade to unlock.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ) : (
        <GeneratedPreview data={result} onUse={onUseDraft} onTryAgain={onTryAgain} />
      )}
    </section>
  );
}

function GeneratedPreview({
  data,
  onUse,
  onTryAgain,
}: {
  data: AiJobGenerationOutput;
  onUse: () => void;
  onTryAgain: () => void;
}) {
  const salary = formatSalary(data.salaryMin ?? null, data.salaryMax ?? null, data.salaryCurrency);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold">{data.title}</p>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{data.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {data.location ? <Badge variant="secondary">{data.location}</Badge> : null}
          {data.workplaceType ? (
            <Badge variant="secondary">{workplaceTypeLabels[data.workplaceType]}</Badge>
          ) : null}
          {data.employmentType ? (
            <Badge variant="secondary">{employmentTypeLabels[data.employmentType]}</Badge>
          ) : null}
          {data.experienceLevel ? (
            <Badge variant="outline">{experienceLevelLabels[data.experienceLevel]}</Badge>
          ) : null}
          {salary ? <Badge variant="outline">{salary}</Badge> : null}
          {data.salaryCurrency && !salary ? (
            <Badge variant="outline">
              {salaryCurrencyLabels[data.salaryCurrency as keyof typeof salaryCurrencyLabels]}
            </Badge>
          ) : null}
        </div>

        {data.requirements.length > 0 ? (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold tracking-tight">Requirements</h3>
              <ul className="space-y-1">
                {data.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-1.5 block size-1 shrink-0 rounded-full bg-primary" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}

        {data.screeningQuestions.length > 0 ? (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold tracking-tight">Screening questions</h3>
              <ul className="space-y-1">
                {data.screeningQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-1.5 block size-1 shrink-0 rounded-full bg-primary" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onUse} className="gap-2">
          <HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} className="size-4" />
          Use this draft
        </Button>
        <Button variant="outline" onClick={onTryAgain} className="gap-2">
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
