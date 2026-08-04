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

  it("retries a throttled provider response using Retry-After", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(
        new Response("{}", { headers: { "content-type": "application/json" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(safeFetchImportSource("https://example.com/jobs", "json")).resolves.toMatchObject({
      text: "{}",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("streams only the requested number of records from a large trusted collection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            jobs: [
              { id: "1", description: 'Contains } and escaped "quotes"' },
              { id: "2", nested: [{ value: true }] },
              { id: "3" },
            ],
          }),
          {
            headers: {
              "content-length": String(20 * 1024 * 1024),
              "content-type": "application/json",
            },
          },
        ),
      ),
    );

    const response = await safeFetchImportSource("https://example.com/jobs", "json", {
      collection: { key: "jobs", maxItems: 2 },
    });

    expect(JSON.parse(response.text)).toEqual({
      jobs: [
        { id: "1", description: 'Contains } and escaped "quotes"' },
        { id: "2", nested: [{ value: true }] },
      ],
    });
  });

  it("streams a top-level provider array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: "1" }, { id: "2" }]), {
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const response = await safeFetchImportSource("https://example.com/jobs", "json", {
      collection: { key: null, maxItems: 1 },
    });

    expect(JSON.parse(response.text)).toEqual([{ id: "1" }]);
  });

  it("continues streaming until it has the requested number of listed jobs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            jobs: [{ id: "hidden", isListed: false }, { id: "1", isListed: true }, { id: "2" }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const response = await safeFetchImportSource("https://example.com/jobs", "json", {
      collection: { key: "jobs", maxItems: 2, filter: "listed" },
    });

    expect(JSON.parse(response.text)).toEqual({
      jobs: [{ id: "1", isListed: true }, { id: "2" }],
    });
  });
});
