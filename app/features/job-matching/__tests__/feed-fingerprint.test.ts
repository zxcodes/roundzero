import { describe, expect, it } from "vitest";

import { candidateFeedInputHash } from "../feed-fingerprint";

describe("candidate feed input fingerprint", () => {
  it("changes when the candidate or a job matching profile changes", async () => {
    const job = {
      id: crypto.randomUUID(),
      profileSourceHash: "job-v1",
      profileVersion: "profile-v1",
      location: "Remote",
      workplaceType: "remote",
    };
    const initial = await candidateFeedInputHash("candidate-v1", [job]);

    expect(await candidateFeedInputHash("candidate-v2", [job])).not.toBe(initial);
    expect(
      await candidateFeedInputHash("candidate-v1", [{ ...job, profileSourceHash: "job-v2" }]),
    ).not.toBe(initial);
    expect(
      await candidateFeedInputHash("candidate-v1", [{ ...job, profileVersion: "profile-v2" }]),
    ).not.toBe(initial);
  });

  it("changes when an eligible job is added or removed", async () => {
    const first = {
      id: crypto.randomUUID(),
      profileSourceHash: "job-v1",
      profileVersion: "profile-v1",
      location: null,
      workplaceType: null,
    };
    const second = { ...first, id: crypto.randomUUID() };

    expect(await candidateFeedInputHash("candidate-v1", [first, second])).not.toBe(
      await candidateFeedInputHash("candidate-v1", [first]),
    );
  });

  it("changes when job location or workplace type changes", async () => {
    const baseJob = {
      id: crypto.randomUUID(),
      profileSourceHash: "job-v1",
      profileVersion: "profile-v1",
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
      profileVersion: "profile-v1",
      location: null,
      workplaceType: null,
    };
    const second = { ...first, id: crypto.randomUUID(), profileSourceHash: "job-v2" };

    expect(await candidateFeedInputHash("candidate-v1", [first, second])).toBe(
      await candidateFeedInputHash("candidate-v1", [second, first]),
    );
  });
});
