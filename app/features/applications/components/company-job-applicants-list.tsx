import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { getJobApplicants } from "@/features/applications/server/functions";
import type { ApplicationStatus } from "@/shared/enums";

const statusLabel: Record<string, string> = {
  applied: "Applied",
  interviewing: "Interviewing",
  evaluated: "Evaluated",
  rejected: "Rejected",
};

const statusTone: Record<ApplicationStatus, string> = {
  applied: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  interviewing: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  evaluated: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

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
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
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
    <div className="space-y-3">
      {applicants.map((applicant) => {
        const tone = statusTone[applicant.status as ApplicationStatus] ?? statusTone.applied;

        return (
          <Link
            key={applicant.id}
            to="/dashboard/applicants/$applicationId"
            params={{ applicationId: applicant.id }}
            className="block"
          >
            <Card
              size="sm"
              className="group ring-foreground/5 transition-all duration-200 hover:ring-primary/30 hover:shadow-md hover:shadow-primary/5"
            >
              <CardContent className="py-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarImage
                        src={applicant.candidatePicture ?? undefined}
                        alt={applicant.candidateName}
                      />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(applicant.candidateName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                          {applicant.candidateName}
                        </span>
                        <Badge className={tone}>{statusLabel[applicant.status] ?? "Applied"}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {applicant.candidateEmail}
                      </p>
                    </div>
                  </div>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
                  />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
