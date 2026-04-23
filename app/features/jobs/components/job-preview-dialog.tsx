import {
  Briefcase01Icon,
  Clock01Icon,
  Location01Icon,
  MoneyBag02Icon,
  UserGroupIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EmploymentType, ExperienceLevel, WorkplaceType } from "@/shared/enums";
import { employmentTypeLabels, experienceLevelLabels, workplaceTypeLabels } from "@/shared/enums";
import { formatSalaryFull } from "@/shared/format";

export interface JobPreviewData {
  title: string;
  description: string;
  requirements: string[];
  companyName: string;
  location: string | null;
  workplaceType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  teamSize: number | null;
  headcount: number | null;
}

export function JobPreviewDialog({ data }: { data: JobPreviewData }) {
  const salary = formatSalaryFull(data.salaryMin, data.salaryMax, data.salaryCurrency);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3.5" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Job preview</DialogTitle>
          <DialogDescription>This is how candidates will see your job posting.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[70vh]">
          <div className="px-6 pb-6 pt-4">
            <JobPreviewContent data={data} salary={salary} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function JobPreviewContent({ data, salary }: { data: JobPreviewData; salary: string | null }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <h3 className="text-xl font-extrabold tracking-tight">{data.title || "Untitled job"}</h3>
        <p className="text-sm text-muted-foreground">{data.companyName}</p>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          {data.employmentType ? (
            <Badge variant="secondary" className="gap-1">
              <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3" />
              {employmentTypeLabels[data.employmentType as EmploymentType] ?? data.employmentType}
            </Badge>
          ) : null}
          {data.experienceLevel ? (
            <Badge variant="secondary">
              {experienceLevelLabels[data.experienceLevel as ExperienceLevel] ??
                data.experienceLevel}
            </Badge>
          ) : null}
          {data.workplaceType ? (
            <Badge variant="outline">
              {workplaceTypeLabels[data.workplaceType as WorkplaceType] ?? data.workplaceType}
            </Badge>
          ) : null}
          {data.location ? (
            <Badge variant="outline" className="gap-1">
              <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3" />
              {data.location}
            </Badge>
          ) : null}
          {salary ? (
            <Badge variant="outline" className="gap-1">
              <HugeiconsIcon icon={MoneyBag02Icon} strokeWidth={2} className="size-3" />
              {salary}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Description */}
      {data.description ? (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Description
          </h4>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {data.description}
          </p>
        </div>
      ) : null}

      {/* Requirements */}
      {data.requirements.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Requirements
          </h4>
          <ul className="space-y-2">
            {data.requirements.map((req, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm leading-relaxed text-foreground/90"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Job details sidebar-style card */}
      <Card>
        <CardContent className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Job details
          </h4>
          {salary ? <DetailRow icon={MoneyBag02Icon} label="Salary" value={salary} /> : null}
          {data.teamSize ? (
            <DetailRow
              icon={UserGroupIcon}
              label="Team size"
              value={`${data.teamSize} ${data.teamSize === 1 ? "person" : "people"}`}
            />
          ) : null}
          {data.headcount ? (
            <DetailRow
              icon={Briefcase01Icon}
              label="Openings"
              value={`${data.headcount} ${data.headcount === 1 ? "position" : "positions"}`}
            />
          ) : null}
          <DetailRow icon={Clock01Icon} label="Posted" value="Today" />
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: typeof MoneyBag02Icon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5 text-primary/70" />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
