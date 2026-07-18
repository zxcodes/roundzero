import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  extractedText: { value: "" },
  getResume: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    RESUMES: { get: mocks.getResume },
  },
}));

vi.mock("docutext", () => ({
  DocuText: {
    fromBuffer: () => ({ text: mocks.extractedText.value }),
  },
}));

import { LIMITS } from "@/shared/ai-refine";
import { createWorkflowLogger } from "@/shared/logger";
import { fetchAndExtractResume } from "@/workflows/pre-evaluation/steps";

function mockResumeObject() {
  mocks.getResume.mockReset();
  mocks.getResume.mockResolvedValue({
    arrayBuffer: async () => new Uint8Array([1]).buffer,
  });
}

describe("pre-evaluation Workflow output", () => {
  it("returns ordinary extracted resume text unchanged", async () => {
    mockResumeObject();
    mocks.extractedText.value = "Built distributed systems at Acme.";

    const result = await fetchAndExtractResume(
      "00000000-0000-4000-8000-000000000001",
      "resumes/candidate.pdf",
      createWorkflowLogger("test", "small-resume"),
    )();

    expect(result).toBe(mocks.extractedText.value);
  });

  it("bounds large extracted text without splitting a Unicode character", async () => {
    mockResumeObject();
    const prefix = "a".repeat(LIMITS.RESUME_TEXT - 1);
    mocks.extractedText.value = `${prefix}🚀trailing content`;

    const result = await fetchAndExtractResume(
      "00000000-0000-4000-8000-000000000001",
      "resumes/candidate.pdf",
      createWorkflowLogger("test", "large-resume"),
    )();

    expect(result).toBe(`${prefix}…[truncated]`);
    expect(result).not.toContain("�");
    expect(new TextEncoder().encode(result).byteLength).toBeLessThan(1024 * 1024);
  });
});
