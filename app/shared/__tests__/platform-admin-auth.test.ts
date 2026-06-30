import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAppEnv = vi.hoisted(() => ({
  PLATFORM_ADMIN_EMAILS: "admin@example.com",
}));

vi.mock("@/shared/env.app", () => ({
  appEnv: mockAppEnv,
}));

describe("platform admin authorization", () => {
  let isPlatformAdmin: (email: string | null | undefined) => boolean;
  let assertPlatformAdmin: (email: string | null | undefined) => void;

  beforeEach(async () => {
    vi.resetModules();
    mockAppEnv.PLATFORM_ADMIN_EMAILS = "admin@example.com";
    const mod = await import("@/shared/platform-admin");
    isPlatformAdmin = mod.isPlatformAdmin;
    assertPlatformAdmin = mod.assertPlatformAdmin;
  });

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
