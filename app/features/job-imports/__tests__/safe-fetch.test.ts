import { afterEach, describe, expect, it, vi } from "vitest";

import { assertSafeImportUrl, safeFetchImportSource } from "../server/safe-fetch";

afterEach(() => vi.unstubAllGlobals());

describe("assertSafeImportUrl", () => {
  it("accepts an ordinary public HTTPS URL", () => {
    expect(assertSafeImportUrl("https://example.com/jobs/123").hostname).toBe("example.com");
  });

  it.each([
    "http://example.com/jobs",
    "https://user:pass@example.com/jobs",
    "https://example.com:8443/jobs",
    "https://localhost/jobs",
    "https://api.internal/jobs",
    "https://127.0.0.1/jobs",
    "https://10.0.0.1/jobs",
    "https://169.254.169.254/latest/meta-data",
    "https://192.168.1.1/jobs",
    "https://[::1]/jobs",
  ])("rejects unsafe URL %s", (input) => {
    expect(() => assertSafeImportUrl(input)).toThrow();
  });

  it("rejects redirects to a private network target", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://169.254.169.254/latest/meta-data" },
        }),
      ),
    );

    await expect(safeFetchImportSource("https://example.com/jobs", "html")).rejects.toThrow(
      "Private or local",
    );
  });

  it("rejects oversized responses before reading the body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{}", {
          headers: {
            "content-length": String(3 * 1024 * 1024),
            "content-type": "application/json",
          },
        }),
      ),
    );

    await expect(safeFetchImportSource("https://example.com/jobs", "json")).rejects.toThrow(
      "too large",
    );
  });
});
