import { describe, expect, it } from "vitest";
import { getInterviewExpiresAt, shouldAutoExpireInterview } from "./expiry";

describe("interview expiry helpers", () => {
  it("parses a valid expiresAt timestamp", () => {
    const iso = "2030-01-01T10:00:00.000Z";
    const parsed = getInterviewExpiresAt({ expiresAt: iso });

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toBe(iso);
  });

  it("returns null for missing or invalid expiresAt", () => {
    expect(getInterviewExpiresAt(null)).toBeNull();
    expect(getInterviewExpiresAt({})).toBeNull();
    expect(getInterviewExpiresAt({ expiresAt: 123 })).toBeNull();
    expect(getInterviewExpiresAt({ expiresAt: "not-a-date" })).toBeNull();
  });

  it("expires only pending or in_progress interviews after deadline", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 60_000).toISOString();

    expect(shouldAutoExpireInterview("pending", { expiresAt: past })).toBe(true);
    expect(shouldAutoExpireInterview("in_progress", { expiresAt: past })).toBe(true);
    expect(shouldAutoExpireInterview("pending", { expiresAt: future })).toBe(false);
    expect(shouldAutoExpireInterview("completed", { expiresAt: past })).toBe(false);
    expect(shouldAutoExpireInterview("cancelled", { expiresAt: past })).toBe(false);
    expect(shouldAutoExpireInterview("expired", { expiresAt: past })).toBe(false);
  });
});
