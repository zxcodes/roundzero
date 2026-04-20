import { UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { AiRankedApplicantsList } from "@/features/ai/components/evaluation-cards";
import type { getJobApplicants } from "@/features/applications/server/functions";
import { getMockAiEvaluation } from "@/mock/ai-evaluations";

export function CompanyJobApplicantsList({
  applicants,
}: {
  applicants: Awaited<ReturnType<typeof getJobApplicants>>;
}) {
  if (applicants.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>No applicants yet</EmptyTitle>
          <EmptyDescription>
            Candidate submissions for this role will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <AiRankedApplicantsList
      items={applicants.map((applicant) => ({
        applicant,
        evaluation: getMockAiEvaluation(applicant.id),
      }))}
    />
  );
}
