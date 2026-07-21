import { describe, expect, it } from "vitest";

import { candidateFeedInputHash } from "../feed-fingerprint";

describe("candidate feed input fingerprint", () => {
  it("changes when job location or workplace type changes", async () => {
    const baseJob = {
      id: crypto.randomUUID(),
      profileSourceHash: "job-v1",
      location: "Remote",
      workplaceType: "remote",
    };
    const initial = await candidateFeedInputHash("candidate-v1", [baseJob]);
    const locationChanged = await candidateFeedInputHash("candidate-v1", [
      { ...baseJob, location: "Bengaluru" },
    ]);
    const workplaceChanged = await candidateFeedInputHash("candidate-v1", [
      { ...baseJob, workplaceType: "onsite" },
    ]);

    expect(locationChanged).not.toBe(initial);
    expect(workplaceChanged).not.toBe(initial);
  });

  it("is independent of retrieval order", async () => {
    const first = {
      id: crypto.randomUUID(),
      profileSourceHash: "job-v1",
      location: null,
      workplaceType: null,
    };
    const second = { ...first, id: crypto.randomUUID(), profileSourceHash: "job-v2" };

    expect(await candidateFeedInputHash("candidate-v1", [first, second])).toBe(
      await candidateFeedInputHash("candidate-v1", [second, first]),
    );
  });
});
