import { AiMagicIcon, Loading03Icon, RefreshIcon, Rocket01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PLAN_CONFIGS } from "@/features/billing/config";
import { useEntitlements } from "@/features/entitlements/hooks/use-entitlements";
import type { JobFormData } from "@/features/jobs/components/job-form";
import type { AiJobGenerationOutput } from "@/features/jobs/schemas";
import { generateJobWithAI } from "@/features/jobs/server/functions";
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
  const reportLimit = entitlements?.reports.perJobLimit ?? PLAN_CONFIGS.free.includedReportsPerJob;

  const mapAiOutputToFormData = (output: AiJobGenerationOutput): JobFormData => {
    return {
      ...output,
      status: "draft",
      expiresAt: null,
      finalReportTarget: reportLimit,
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
      toast.error(error instanceof Error ? error.message : "Failed to generate job");
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
    setPrompt("");
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
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} className="size-5 text-primary" />
          <CardTitle className="text-base">Create with AI</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Describe the role in a few sentences and we will build the posting for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <div className="space-y-3">
            <Textarea
              placeholder="e.g. Senior React frontend engineer with 5+ years experience, remote-friendly, $120-160k, working on a design system..."
              value={prompt}
              onChange={onPromptChange}
              rows={3}
              maxLength={500}
              disabled={!isPaid || isGenerating}
              className="bg-background"
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
                    Generating...
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
                  <p>AI job creation is available on Pro. Upgrade to unlock.</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : (
          <GeneratedPreview data={result} onUse={onUseDraft} onTryAgain={onTryAgain} />
        )}
      </CardContent>
    </Card>
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

        <div className="flex flex-wrap gap-2 text-xs">
          {data.location ? (
            <span className="rounded-md bg-background px-2 py-1">{data.location}</span>
          ) : null}
          {data.workplaceType ? (
            <span className="rounded-md bg-background px-2 py-1">
              {workplaceTypeLabels[data.workplaceType]}
            </span>
          ) : null}
          {data.employmentType ? (
            <span className="rounded-md bg-background px-2 py-1">
              {employmentTypeLabels[data.employmentType]}
            </span>
          ) : null}
          {data.experienceLevel ? (
            <span className="rounded-md bg-background px-2 py-1">
              {experienceLevelLabels[data.experienceLevel]}
            </span>
          ) : null}
          {salary ? <span className="rounded-md bg-background px-2 py-1">{salary}</span> : null}
          {data.salaryCurrency && !salary ? (
            <span className="rounded-md bg-background px-2 py-1">
              {salaryCurrencyLabels[data.salaryCurrency as keyof typeof salaryCurrencyLabels]}
            </span>
          ) : null}
        </div>

        {data.requirements.length > 0 ? (
          <>
            <Separator />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Requirements
              </p>
              <ul className="mt-1.5 space-y-1">
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
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Screening questions
              </p>
              <ul className="mt-1.5 space-y-1">
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
