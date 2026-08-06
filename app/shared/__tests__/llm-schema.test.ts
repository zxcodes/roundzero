import { zodSchema } from "@ai-sdk/provider-utils";
import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  candidateMatchingProfileGenerationSchema,
  createRerankerOutputGenerationSchema,
  jobMatchingProfileGenerationSchema,
} from "@/features/job-matching/schemas";
import { aiJobGenerationSchema } from "@/features/jobs/schemas";
import {
  answerAuthenticitySchema,
  reportGenerationSchema,
  reportScoresSchema,
} from "@/features/reports/schemas";
import { jobTypeSchema } from "@/prompts/classify-job";
import { communicationAssessmentSchema } from "@/prompts/communication-assessment";
import {
  preEvaluationGenerationSchema,
  slopDetectionGenerationSchema,
} from "@/prompts/pre-evaluation-output";
import { reportAuditGenerationSchema } from "@/prompts/report-audit-output";
import {
  llmReportScoresSchema,
  normalizeCandidateScoreValue,
  normalizeReportScoresInput,
} from "@/shared/llm-schema";

type JsonSchema = Record<string, unknown>;

function collectNumberMinMaxViolations(
  schema: JsonSchema,
  path = "$",
  violations: string[] = [],
): string[] {
  if (!schema || typeof schema !== "object") {
    return violations;
  }

  if (schema.type === "number" || schema.type === "integer") {
    if ("minimum" in schema) violations.push(`${path}: minimum`);
    if ("maximum" in schema) violations.push(`${path}: maximum`);
    if ("exclusiveMinimum" in schema) violations.push(`${path}: exclusiveMinimum`);
    if ("exclusiveMaximum" in schema) violations.push(`${path}: exclusiveMaximum`);
  }

  if (schema.properties && typeof schema.properties === "object") {
    for (const [key, child] of Object.entries(schema.properties as Record<string, JsonSchema>)) {
      collectNumberMinMaxViolations(child, `${path}.${key}`, violations);
    }
  }

  if (schema.items && typeof schema.items === "object") {
    collectNumberMinMaxViolations(schema.items as JsonSchema, `${path}[]`, violations);
  }

  for (const key of ["allOf", "anyOf", "oneOf"] as const) {
    const branch = schema[key];
    if (Array.isArray(branch)) {
      branch.forEach((child, index) => {
        collectNumberMinMaxViolations(child as JsonSchema, `${path}.${key}[${index}]`, violations);
      });
    }
  }

  return violations;
}

/**
 * Convert via the exact path the AI SDK uses at runtime (`Output.object` → `asSchema`
 * → `zodSchema().jsonSchema`), so this audit reflects the schema actually sent to the
 * provider rather than a separate library's approximation.
 */
async function toJsonSchema(schema: z.ZodType): Promise<JsonSchema> {
  return (await zodSchema(schema).jsonSchema) as JsonSchema;
}

const generationSchemas = {
  communicationAssessmentSchema,
  reportGenerationSchema,
  reportScoresGenerationSchema: llmReportScoresSchema,
  answerAuthenticitySchema,
  jobTypeSchema,
  aiJobGenerationSchema,
  preEvaluationGenerationSchema,
  slopDetectionGenerationSchema,
  reportAuditGenerationSchema,
  candidateMatchingProfileGenerationSchema,
  jobMatchingProfileGenerationSchema,
  rerankerOutputGenerationSchema: createRerankerOutputGenerationSchema(["job-1", "job-2"]),
} as const;

const matchingGenerationSchemas = {
  candidateMatchingProfileGenerationSchema,
  jobMatchingProfileGenerationSchema,
  rerankerOutputGenerationSchema: createRerankerOutputGenerationSchema(["job-1", "job-2"]),
} as const;

function collectUnsupportedMatchingKeywords(
  schema: JsonSchema,
  path = "$",
  violations: string[] = [],
): string[] {
  for (const keyword of [
    "minItems",
    "maxItems",
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
  ]) {
    if (keyword in schema) violations.push(`${path}: ${keyword}`);
  }

  if (schema.properties && typeof schema.properties === "object") {
    for (const [key, child] of Object.entries(schema.properties as Record<string, JsonSchema>)) {
      collectUnsupportedMatchingKeywords(child, `${path}.${key}`, violations);
    }
  }
  if (schema.items && typeof schema.items === "object") {
    collectUnsupportedMatchingKeywords(schema.items as JsonSchema, `${path}[]`, violations);
  }
  for (const key of ["allOf", "anyOf", "oneOf"] as const) {
    const branch = schema[key];
    if (Array.isArray(branch)) {
      branch.forEach((child, index) => {
        collectUnsupportedMatchingKeywords(
          child as JsonSchema,
          `${path}.${key}[${index}]`,
          violations,
        );
      });
    }
  }
  return violations;
}

describe("llm-schema score normalization", () => {
  it("clamps nested 0–100 scores onto 0–10", () => {
    expect(normalizeCandidateScoreValue(72)).toBe(7.2);
    expect(normalizeCandidateScoreValue(8.4)).toBe(8.4);
    expect(normalizeCandidateScoreValue("bad")).toBe(5);
  });

  it("normalizes report score objects", () => {
    const normalized = normalizeReportScoresInput({
      communication: 80,
      problemSolving: 7,
      ownership: 6.5,
      roleFit: 90,
      overall: 75,
    });
    expect(normalized).toEqual({
      communication: 8,
      problemSolving: 7,
      ownership: 6.5,
      roleFit: 9,
      overall: 7.5,
    });
  });
});

/**
 * Anthropic-safe audit using the AI SDK's own `zodSchema()` conversion — the same JSON
 * Schema `Output.object()` sends to the provider. A provider may still apply its own
 * transforms downstream, but this catches the `minimum`/`maximum`-on-number regression
 * that broke voice scoring in prod.
 */
describe("LLM generation schema audit", () => {
  it("generation schemas avoid number minimum/maximum JSON Schema keywords", async () => {
    for (const [name, schema] of Object.entries(generationSchemas)) {
      const json = await toJsonSchema(schema);
      const violations = collectNumberMinMaxViolations(json);
      expect(violations, `${name} must be Anthropic-safe`).toEqual([]);
    }
  });

  it("matching generation schemas use only Anthropic-compatible validation keywords", async () => {
    for (const [name, schema] of Object.entries(matchingGenerationSchemas)) {
      const json = await toJsonSchema(schema);
      expect(collectUnsupportedMatchingKeywords(json), `${name} must be Anthropic-safe`).toEqual(
        [],
      );
    }
  });

  it("strict storage report scores still enforce 0–10", () => {
    expect(
      reportScoresSchema.safeParse({
        communication: 11,
        problemSolving: 5,
        ownership: 5,
        roleFit: 5,
        overall: 5,
      }).success,
    ).toBe(false);
    expect(
      reportScoresSchema.safeParse({
        communication: 7,
        problemSolving: 5,
        ownership: 5,
        roleFit: 5,
        overall: 5,
      }).success,
    ).toBe(true);
  });
});
