import { toast } from "sonner";

import { publicJobUrl } from "@/shared/seo";

type JobLinkSource = {
  status: string;
  archivedAt?: Date | string | null;
};

export function canCopyPublicJobLink(job: JobLinkSource) {
  if (job.status === "draft") {
    return false;
  }

  if (job.status === "closed" && job.archivedAt) {
    return false;
  }

  return job.status === "open" || job.status === "closed";
}

export async function copyPublicJobLink(jobId: string) {
  try {
    await navigator.clipboard.writeText(publicJobUrl(jobId));
    toast.success("Job link copied");
  } catch {
    toast.error("Failed to copy link.");
  }
}
