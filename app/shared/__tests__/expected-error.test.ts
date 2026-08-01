import type { ErrorEvent } from "@sentry/cloudflare";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ExpectedError, expectedErrorAdapter } from "@/shared/expected-error";
import { filterExpectedSentryEvent } from "@/shared/sentry";
import { zodValidator } from "@/shared/validation";

describe("expected errors", () => {
  const event: ErrorEvent = { event_id: "test-event", type: undefined };

  it("drops expected errors from Sentry", () => {
    const error = new ExpectedError("conflict", "The resource changed");

    expect(filterExpectedSentryEvent(event, { originalException: error })).toBeNull();
    expect(error.name).toBe("ExpectedError");
    expect(error.code).toBe("conflict");
  });

  it("keeps unexpected errors and messages", () => {
    expect(
      filterExpectedSentryEvent(event, { originalException: new Error("Database failed") }),
    ).toBe(event);
    expect(filterExpectedSentryEvent(event, { originalException: "Request failed" })).toBe(event);
  });

  it("classifies server input validation as expected", () => {
    const validator = zodValidator(z.object({ id: z.uuid() }));

    expect(() => validator.parse({ id: "invalid" })).toThrow(ExpectedError);
  });

  it("preserves expected errors across TanStack serialization", () => {
    const serialized = expectedErrorAdapter.toSerializable(
      new ExpectedError("expired", "The invitation expired"),
    );
    const restored = expectedErrorAdapter.fromSerializable(serialized);

    expect(restored).toBeInstanceOf(ExpectedError);
    expect(restored.code).toBe("expired");
    expect(restored.message).toBe("The invitation expired");
  });
});
