import { Cancel01Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  companyBootstrapQueryKey,
  dismissMyCompanyJobImportPrompt,
} from "@/features/companies/server/functions";

export function JobImportAnnouncement() {
  const [hidden, setHidden] = useState(false);
  const queryClient = useQueryClient();
  const dismissFn = useServerFn(dismissMyCompanyJobImportPrompt);
  const dismissMutation = useMutation({
    mutationFn: dismissFn,
    onMutate: () => setHidden(true),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyBootstrapQueryKey });
    },
    onError: () => {
      setHidden(false);
      toast.error("Could not dismiss the import suggestion.");
    },
  });

  const onDismiss = () => dismissMutation.mutate({});

  if (hidden) return null;

  return (
    <Alert className="border-border/60 bg-muted/30 px-5 py-4 pr-14">
      <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} className="size-4" />
      <AlertTitle className="flex flex-wrap items-center gap-2">
        Already hiring elsewhere?
      </AlertTitle>
      <AlertDescription className="max-w-4xl">
        Import up to 50 jobs at once from Greenhouse, Lever, Ashby, Recruitee, SmartRecruiters,
        other public job pages, or CSV.
      </AlertDescription>
      <div className="col-start-2 mt-2">
        <Button size="sm" asChild>
          <Link to="/dashboard/jobs/import">
            <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} data-icon="inline-start" />
            Import existing jobs
          </Link>
        </Button>
      </div>
      <AlertAction>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss job import suggestion"
          onClick={onDismiss}
          disabled={dismissMutation.isPending}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} data-icon="inline-start" />
        </Button>
      </AlertAction>
    </Alert>
  );
}
