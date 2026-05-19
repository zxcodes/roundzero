import { Link04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type WorkHistoryEntry = {
  company: string;
  title: string;
  startMonth: string | null;
  endMonth: string | null;
  currentlyWorkingHere: boolean;
  description: string | null;
};

type SnapshotLink = {
  label: string;
  href: string;
};

type SubmittedProfileSnapshotProps = {
  headline: string | null;
  bio: string | null;
  skills: string[];
  links: SnapshotLink[];
  workHistory: WorkHistoryEntry[];
  hasResume: boolean;
  headerExtra?: ReactNode;
  formatMonthRange?: (entry: WorkHistoryEntry) => string;
};

function SubmittedProfileSnapshot({
  headline,
  bio,
  skills,
  links,
  workHistory,
  hasResume,
  headerExtra,
  formatMonthRange,
}: SubmittedProfileSnapshotProps) {
  const hasContent =
    headline || hasResume || bio || skills.length > 0 || workHistory.length > 0 || links.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Submitted Profile
        </p>
        {headerExtra}
      </div>
      <div className="space-y-3">
        {headline || hasResume ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {headline ? (
              <Card size="sm">
                <CardContent className="py-0">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Headline
                  </p>
                  <p className="mt-1 text-sm text-foreground">{headline}</p>
                </CardContent>
              </Card>
            ) : null}
            {hasResume ? (
              <Card size="sm">
                <CardContent className="py-0">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Resume
                  </p>
                  <p className="mt-1 text-sm text-foreground">Attached at apply time</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {bio ? (
          <Card size="sm">
            <CardContent className="py-0">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Bio
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">{bio}</p>
            </CardContent>
          </Card>
        ) : null}

        {skills.length > 0 ? (
          <Card size="sm">
            <CardContent className="py-0">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Skills
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {workHistory.length > 0 && formatMonthRange ? (
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Work history
            </p>
            {workHistory.map((entry, index) => (
              <Card key={`${entry.company}-${entry.title}-${index}`} size="sm">
                <CardContent className="py-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">{entry.company}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {formatMonthRange(entry)}
                    </Badge>
                  </div>
                  {entry.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {entry.description}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {links.length > 0 ? (
          <Card size="sm">
            <CardContent className="py-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Links
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {links.map((link) => (
                  <Button key={link.label} variant="outline" asChild size="xs">
                    <a href={link.href} target="_blank" rel="noopener noreferrer">
                      <HugeiconsIcon icon={Link04Icon} strokeWidth={2} className="size-3" />
                      {link.label}
                    </a>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

export { SubmittedProfileSnapshot };
