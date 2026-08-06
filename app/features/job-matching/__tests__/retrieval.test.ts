import { describe, expect, it } from "vitest";

import { retrieveJobs } from "../retrieval";
import { candidateProfile, jobProfile } from "./fixtures";

describe("functional retrieval boundary", () => {
  it("keeps technical adjacent-role matches and excludes cross-functional sales", () => {
    const untrustedCandidate = {
      ...candidateProfile,
      adjacentFunctionalFamilies: ["sales_gtm" as const],
    };
    const jobs = [
      { id: "frontend", createdAt: new Date(2), profile: jobProfile },
      {
        id: "data",
        createdAt: new Date(1),
        profile: { ...jobProfile, functionalFamilies: ["data_ai" as const] },
      },
      {
        id: "sales",
        createdAt: new Date(3),
        profile: { ...jobProfile, functionalFamilies: ["sales_gtm" as const] },
      },
    ];
    expect(retrieveJobs(untrustedCandidate, jobs).map((job) => job.id)).toEqual([
      "frontend",
      "data",
    ]);
  });

  it("reserves retrieval capacity for safe adjacent families", () => {
    const jobs = [
      ...Array.from({ length: 25 }, (_, index) => ({
        id: `primary-${index}`,
        createdAt: new Date(index),
        profile: jobProfile,
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `adjacent-${index}`,
        createdAt: new Date(index),
        profile: { ...jobProfile, functionalFamilies: ["data_ai" as const] },
      })),
    ];
    expect(retrieveJobs({ ...candidateProfile, adjacentFunctionalFamilies: [] }, jobs)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "adjacent-0" })]),
    );
  });

  it("does not pad with newest zero-overlap jobs", () => {
    const jobs = Array.from({ length: 20 }, (_, index) => ({
      id: String(index),
      createdAt: new Date(index),
      profile: { ...jobProfile, functionalFamilies: ["sales_gtm" as const] },
    }));
    expect(retrieveJobs(candidateProfile, jobs)).toEqual([]);
  });
});
