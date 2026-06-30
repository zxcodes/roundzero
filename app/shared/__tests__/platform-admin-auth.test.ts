import { afterEach, describe, expect, it, vi } from "vitest";

const mockAppEnv = vi.hoisted(() => ({
  PLATFORM_ADMIN_EMAILS: "admin@example.com",
}));

vi.mock("@/shared/env.app", () => ({
  appEnv: mockAppEnv,
}));

import { assertPlatformAdmin, isPlatformAdmin } from "@/shared/platform-admin";

describe("platform admin authorization", () => {
  afterEach(() => {
    mockAppEnv.PLATFORM_ADMIN_EMAILS = "admin@example.com";
  });

  it("allows emails on the configured allowlist", () => {
    expect(isPlatformAdmin("admin@example.com")).toBe(true);
    expect(isPlatformAdmin("ADMIN@example.com")).toBe(true);
    expect(() => assertPlatformAdmin("admin@example.com")).not.toThrow();
  });

  it("rejects emails not on the allowlist", () => {
    expect(isPlatformAdmin("other@example.com")).toBe(false);
    expect(() => assertPlatformAdmin("other@example.com")).toThrow("Not authorized");
  });

  it("denies everyone when the allowlist is empty", () => {
    mockAppEnv.PLATFORM_ADMIN_EMAILS = "";

    expect(isPlatformAdmin("admin@example.com")).toBe(false);
    expect(() => assertPlatformAdmin("admin@example.com")).toThrow("Not authorized");
  });

  it("rejects missing emails", () => {
    expect(isPlatformAdmin(null)).toBe(false);
    expect(() => assertPlatformAdmin(null)).toThrow("Not authorized");
  });
});
