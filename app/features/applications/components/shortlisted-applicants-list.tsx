import { Copy01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { RoleAccordionPanel } from "@/components/role-accordion-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <Empty className="rounded-2xl border-0 bg-muted/30">
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
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <RoleAccordionPanel
          key={group.jobId}
          jobId={group.jobId}
          jobTitle={group.jobTitle}
          count={group.applicants.length}
          countLabel={`candidate${group.applicants.length === 1 ? "" : "s"} shortlisted`}
        >
          {group.applicants.map((applicant) => (
            <ShortlistedApplicantRow key={applicant.id} applicant={applicant} />
          ))}
        </RoleAccordionPanel>
      ))}
    </div>
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
    void router.navigate({
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
            trigger={
              <Button variant="outline" size="sm">
                Edit note
              </Button>
            }
          />
          <Button size="sm" onClick={onViewCandidate}>
            View candidate
          </Button>
        </div>
      </div>

      {shortlistDetails?.note ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-2xl bg-muted/60 px-3 py-1.5 text-foreground">
            <span className="font-medium">Note: </span>
            {shortlistDetails.note}
          </span>
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

  return Array.from(map.values()).sort((a, b) => a.jobTitle.localeCompare(b.jobTitle));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
