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

interface JobPreviewData {
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

export function JobPreviewDialog({
  data,
  open,
  onOpenChange,
  showDefaultTrigger = true,
}: {
  data: JobPreviewData;
  /** Controlled open state. When provided, the parent owns visibility. */
  open?: boolean;
  /** Called when the dialog wants to change open state. */
  onOpenChange?: (open: boolean) => void;
  /** Set to false to hide the built-in "Preview" trigger button. */
  showDefaultTrigger?: boolean;
}) {
  const salary = formatSalaryFull(data.salaryMin, data.salaryMax, data.salaryCurrency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showDefaultTrigger ? (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3.5" />
            Preview
          </Button>
        </DialogTrigger>
      ) : null}
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
      <div className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">{data.title || "Untitled job"}</h3>
        <p className="text-sm text-muted-foreground">{data.companyName}</p>

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
        </div>
      </div>

      {data.description ? (
        <section className="space-y-3 rounded-2xl bg-muted/30 px-5 py-4">
          <h4 className="text-sm font-semibold tracking-tight">Description</h4>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {data.description}
          </p>
        </section>
      ) : null}

      {data.requirements.length > 0 ? (
        <section className="space-y-3 rounded-2xl bg-muted/30 px-5 py-4">
          <h4 className="text-sm font-semibold tracking-tight">Requirements</h4>
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
        </section>
      ) : null}

      <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
        <h4 className="text-sm font-semibold tracking-tight">Job details</h4>
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
      </section>
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
