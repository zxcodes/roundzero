import { describe, expect, it } from "vitest";

import { capScoreForEvidence, scoreMatchDimensions, validateAndRenderEvidence } from "../evidence";
import { candidateProfile, jobProfile } from "./fixtures";

describe("semantic match evidence", () => {
  it("accepts valid semantically different item references and renders stored items", () => {
    expect(
      validateAndRenderEvidence(candidateProfile, jobProfile, [
        { candidateItemId: "capability-1", jobItemId: "responsibility-1" },
      ]),
    ).toEqual([
      {
        candidateFactId: "capability-1",
        jobFactId: "responsibility-1",
        text: "Web product delivery aligns with deliver web interfaces.",
      },
    ]);
  });

  it("drops fabricated IDs and duplicate references", () => {
    expect(
      validateAndRenderEvidence(candidateProfile, jobProfile, [
        { candidateItemId: "missing", jobItemId: "responsibility-1" },
        { candidateItemId: "capability-1", jobItemId: "responsibility-1" },
        { candidateItemId: "capability-1", jobItemId: "responsibility-1" },
      ]),
    ).toHaveLength(1);
  });

  it("omits zero evidence and functional mismatch and caps one-evidence matches", () => {
    const one = [{ candidateFactId: "c1", jobFactId: "j1", text: "one" }];
    const repeated = [...one, { candidateFactId: "c1", jobFactId: "j2", text: "two" }];
    const independent = [...one, { candidateFactId: "c2", jobFactId: "j2", text: "two" }];
    expect(capScoreForEvidence(95, [], 100)).toBeNull();
    expect(capScoreForEvidence(95, independent, 30)).toBeNull();
    expect(capScoreForEvidence(95, one, 100)).toBe(59);
    expect(capScoreForEvidence(95, repeated, 100)).toBe(59);
    expect(capScoreForEvidence(95, independent, 100)).toBe(95);
  });

  it("derives overall score from weighted dimensions", () => {
    expect(
      scoreMatchDimensions({
        roleFunction: 100,
        capabilitiesResponsibilities: 80,
        technologies: 60,
        seniority: 40,
        domain: 20,
      }),
    ).toBe(75);
  });

  it("keeps rendered reasons within storage length at label boundaries", () => {
    const label = "A".repeat(110);
    const reasons = validateAndRenderEvidence(
      { ...candidateProfile, capabilities: [{ ...candidateProfile.capabilities[0], label }] },
      { ...jobProfile, responsibilities: [{ ...jobProfile.responsibilities[0], label }] },
      [{ candidateItemId: "capability-1", jobItemId: "responsibility-1" }],
    );
    expect(reasons[0]?.text.length).toBeLessThanOrEqual(240);
  });
});
