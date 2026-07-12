import { describe, expect, it } from "vitest";

import {
  buildPlatformAdminAllowlist,
  isPlatformAdminEmail,
} from "@/shared/platform-admin-allowlist";

describe("platform admin allowlist", () => {
  it("normalizes and deduplicates admin emails", () => {
    const allowlist = buildPlatformAdminAllowlist(
      " Admin@Example.com , admin@example.com , Ops@RoundZero.dev ",
    );

    expect(allowlist.size).toBe(2);
    expect(isPlatformAdminEmail("admin@example.com", allowlist)).toBe(true);
    expect(isPlatformAdminEmail("OPS@roundzero.dev", allowlist)).toBe(true);
  });

  it("rejects empty or missing allowlists", () => {
    expect(buildPlatformAdminAllowlist("")).toEqual(new Set());
    expect(buildPlatformAdminAllowlist(undefined)).toEqual(new Set());
    expect(isPlatformAdminEmail("admin@example.com", new Set())).toBe(false);
    expect(isPlatformAdminEmail(null, buildPlatformAdminAllowlist("admin@example.com"))).toBe(
      false,
    );
  });
});
