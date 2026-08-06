import { rerankerOutputSchema, type JobMatchingProfile } from "./schemas";

type RerankerJob = {
  id: string;
  profile: JobMatchingProfile;
  retrievalScore: number;
};

export function createRerankerTransport(jobs: RerankerJob[]) {
  const realJobIdsByReference = new Map<string, string>();
  const transportJobs = jobs.map(({ id, ...job }, index) => {
    const reference = `job-${index + 1}`;
    realJobIdsByReference.set(reference, id);
    return { ...job, id: reference };
  });

  return { transportJobs, realJobIdsByReference };
}

export function restoreRerankerJobIds(
  output: { matches: Array<{ jobId: string } & Record<string, unknown>> },
  realJobIdsByReference: ReadonlyMap<string, string>,
) {
  const matches = output.matches.map((match) => {
    const jobId = realJobIdsByReference.get(match.jobId);
    if (!jobId) throw new Error("Reranker returned an unknown job reference");
    return { ...match, jobId };
  });

  return rerankerOutputSchema.parse({ matches });
}
