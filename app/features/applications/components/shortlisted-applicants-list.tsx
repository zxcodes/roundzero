import { ArrowRight01Icon, Copy01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { getShortlistedApplicants } from "@/features/applications/server/functions";
import { hasShortlistNextSteps, parseShortlistDetails } from "@/features/applications/shortlist";
import { ScorePill } from "@/features/reports/components/score-pill";
import { getOverallScore } from "@/features/reports/schemas";
import { formatDateTime } from "@/shared/date";
import { recommendationSchema } from "@/shared/enums";
import { ShortlistDialog } from "./shortlist-dialog";

type ShortlistedApplicant = Awaited<ReturnType<typeof getShortlistedApplicants>>[number];

type ShortlistedGroup = {
  jobId: string;
  jobTitle: string;
  applicants: ShortlistedApplicant[];
};

export function ShortlistedApplicantsList({
  applicants,
}: {
  applicants: Awaited<ReturnType<typeof getShortlistedApplicants>>;
}) {
  if (applicants.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>No shortlisted candidates yet</EmptyTitle>
          <EmptyDescription>
            Candidates you shortlist will collect here so your team can handle outreach role by
            role.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const groups = buildShortlistedGroups(applicants);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          label="Shortlisted"
          value={String(applicants.length)}
          description="Candidates in decision mode."
        />
        <MetricCard
          label="Roles"
          value={String(groups.length)}
          description="Open roles with shortlisted candidates."
        />
        <MetricCard
          label="With next steps"
          value={String(applicants.filter(hasCandidateNextSteps).length)}
          description="Candidates with a note or link attached."
        />
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <Accordion key={group.jobId} type="multiple" defaultValue={[group.jobId]}>
            <AccordionItem value={group.jobId}>
              <AccordionTrigger className="px-5 py-4 text-left hover:no-underline md:px-6">
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 pr-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                      Shortlisted
                    </p>
                    <h3 className="truncate text-lg font-semibold">{group.jobTitle}</h3>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {group.applicants.length} candidate
                    {group.applicants.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 md:px-6">
                <div className="divide-y divide-border/50 rounded-3xl border border-border/60">
                  {group.applicants.map((applicant) => (
                    <ShortlistedApplicantRow key={applicant.id} applicant={applicant} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <CardTitle className="font-mono text-3xl font-semibold tracking-tight">{value}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function ShortlistedApplicantRow({ applicant }: { applicant: ShortlistedApplicant }) {
  const router = useRouter();
  const shortlistDetails = parseShortlistDetails(applicant.metadata);
  const hasNextSteps = hasShortlistNextSteps(shortlistDetails);
  const parsedRecommendation = recommendationSchema.safeParse(applicant.reportRecommendation);
  const recommendation = parsedRecommendation.success ? parsedRecommendation.data : null;
  const score = getOverallScore(applicant.reportScores);

  const onCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(applicant.candidateEmail);
      toast.success("Candidate email copied");
    } catch {
      toast.error("Failed to copy email.");
    }
  };

  const onViewCandidate = () => {
    router.navigate({
      to: "/dashboard/applicants/$applicationId",
      params: { applicationId: applicant.id },
    });
  };

  return (
    <div className="px-4 py-4 md:px-5">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Avatar className="size-10">
          <AvatarImage
            src={applicant.candidatePicture ?? undefined}
            alt={applicant.candidateName}
          />
          <AvatarFallback className="text-[10px]">
            {getInitials(applicant.candidateName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{applicant.candidateName}</p>
            {hasNextSteps ? (
              <Badge variant="outline" className="border-success/20 text-success">
                Next steps ready
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{applicant.candidateEmail}</p>
        </div>

        <ScorePill score={score} recommendation={recommendation} size="sm" className="md:ml-auto" />

        <div className="flex w-full flex-wrap items-center gap-1.5 md:w-auto md:justify-end">
          <Button variant="outline" size="sm" onClick={onCopyEmail}>
            <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3.5" />
            Copy email
          </Button>
          <ShortlistDialog
            applicationId={applicant.id}
            candidateName={applicant.candidateName}
            mode="edit"
            defaultNote={shortlistDetails?.note ?? null}
            defaultLink={shortlistDetails?.link ?? null}
            trigger={
              <Button variant="outline" size="sm">
                Edit next steps
              </Button>
            }
          />
          <Button size="sm" onClick={onViewCandidate}>
            View candidate
          </Button>
        </div>
      </div>

      {shortlistDetails?.note || shortlistDetails?.link || shortlistDetails?.updatedAt ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {shortlistDetails.note ? (
            <span className="rounded-2xl bg-muted/60 px-3 py-1.5 text-foreground">
              <span className="font-medium">Note: </span>
              {shortlistDetails.note}
            </span>
          ) : null}
          {shortlistDetails.link ? (
            <Button variant="ghost" size="xs" asChild>
              <a href={shortlistDetails.link} target="_blank" rel="noreferrer">
                View link
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3" />
              </a>
            </Button>
          ) : null}
          {shortlistDetails.updatedAt ? (
            <span className="text-muted-foreground/60">
              Updated {formatDateTime(shortlistDetails.updatedAt)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function buildShortlistedGroups(applicants: ShortlistedApplicant[]): ShortlistedGroup[] {
  const map = new Map<string, ShortlistedGroup>();

  for (const applicant of applicants) {
    const existing = map.get(applicant.jobId);
    if (existing) {
      existing.applicants.push(applicant);
      continue;
    }
    map.set(applicant.jobId, {
      jobId: applicant.jobId,
      jobTitle: applicant.jobTitle,
      applicants: [applicant],
    });
  }

  return Array.from(map.values());
}

function hasCandidateNextSteps(applicant: ShortlistedApplicant) {
  return hasShortlistNextSteps(parseShortlistDetails(applicant.metadata));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
