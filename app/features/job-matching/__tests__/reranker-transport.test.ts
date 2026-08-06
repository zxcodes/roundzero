import { describe, expect, it } from "vitest";

import { createRerankerTransport, restoreRerankerJobIds } from "../reranker-transport";
import { candidateProfile, jobProfile } from "./fixtures";

const outputMatch = (jobId: string) => ({
  jobId,
  score: 75,
  dimensions: {
    roleFunction: 80,
    capabilitiesResponsibilities: 70,
    technologies: 70,
    seniority: 80,
    domain: 50,
  },
  evidencePairs: [],
});

describe("reranker transport", () => {
  it("maps real UUIDs deterministically without putting them in model jobs", () => {
    const realIds = [crypto.randomUUID(), crypto.randomUUID()];
    const transport = createRerankerTransport(
      realIds.map((id) => ({ id, profile: jobProfile, retrievalScore: 80 })),
    );

    expect(transport.transportJobs.map((job) => job.id)).toEqual(["job-1", "job-2"]);
    expect(
      JSON.stringify({ candidate: candidateProfile, jobs: transport.transportJobs }),
    ).not.toContain(realIds[0]);
    expect(transport.realJobIdsByReference).toEqual(
      new Map([
        ["job-1", realIds[0]],
        ["job-2", realIds[1]],
      ]),
    );
  });

  it("maps model transport references back to the original UUIDs", () => {
    const realIds = [crypto.randomUUID(), crypto.randomUUID()];
    const transport = createRerankerTransport(
      realIds.map((id) => ({ id, profile: jobProfile, retrievalScore: 80 })),
    );

    const restored = restoreRerankerJobIds(
      { matches: [outputMatch("job-2"), outputMatch("job-1")] },
      transport.realJobIdsByReference,
    );
    expect(restored.matches.map((match) => match.jobId)).toEqual([realIds[1], realIds[0]]);
  });

  it("rejects unknown references rather than accepting model-provided IDs", () => {
    const realId = crypto.randomUUID();
    const transport = createRerankerTransport([
      { id: realId, profile: jobProfile, retrievalScore: 80 },
    ]);

    expect(() =>
      restoreRerankerJobIds(
        { matches: [outputMatch(crypto.randomUUID())] },
        transport.realJobIdsByReference,
      ),
    ).toThrow("Reranker returned an unknown job reference");
  });
});
