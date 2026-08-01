import { notFound } from "@tanstack/react-router";
import { zodValidator as tanstackZodValidator } from "@tanstack/zod-adapter";
import type { ZodSchema } from "zod";
import { z } from "zod";

import { ExpectedError } from "@/shared/expected-error";

const uuidSchema = z.string().uuid();

export function validateUuidParams(params: Record<string, string | undefined>) {
  for (const [_key, value] of Object.entries(params)) {
    if (value !== undefined && !uuidSchema.safeParse(value).success) {
      throw notFound();
    }
  }
}

export function zodValidator<T extends ZodSchema>(schema: T) {
  const validator = tanstackZodValidator(schema);
  return {
    ...validator,
    parse: (input: unknown) => {
      try {
        return validator.parse(input);
      } catch (err) {
        if (err instanceof z.ZodError && err.issues?.length) {
          const messages = err.issues.map((issue) => issue.message);
          throw new ExpectedError("invalid_input", messages.join(", "));
        }
        throw err;
      }
    },
  };
}

export function requiredTrimmedString(max: number, message: string) {
  return z.string().trim().min(1, message).max(max);
}

export function optionalTrimmedString(max: number) {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(max).optional());
}

export function nullableTrimmedString(max: number) {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, z.string().max(max).nullable());
}

export function optionalTrimmedUrl() {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.url().optional());
}

export function nullableTrimmedUrl() {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, z.url().nullable());
}
