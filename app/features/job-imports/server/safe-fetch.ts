import { ExpectedError } from "@/shared/expected-error";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

const FORBIDDEN_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home", ".lan"];

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const bytes = parts.map((part) => Number(part));
  if (bytes.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return bytes;
}

function isForbiddenIpv4(bytes: number[]): boolean {
  const [a, b] = bytes;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function assertSafeImportUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ExpectedError("invalid_input", "The source returned an invalid URL.");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new ExpectedError("invalid_input", "Only public HTTPS job URLs are supported.");
  }
  if (url.port && url.port !== "443") {
    throw new ExpectedError("invalid_input", "Custom URL ports are not supported.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isIpv6 = hostname.includes(":");
  if (
    hostname === "localhost" ||
    hostname === "::" ||
    hostname === "::1" ||
    (isIpv6 &&
      (hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80:"))) ||
    FORBIDDEN_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new ExpectedError("invalid_input", "Private or local network URLs are not supported.");
  }

  const ipv4 = parseIpv4(hostname);
  if (ipv4 && isForbiddenIpv4(ipv4)) {
    throw new ExpectedError("invalid_input", "Private or local network URLs are not supported.");
  }

  return url;
}

async function readBoundedText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new ExpectedError("invalid_input", "The source response is too large to import.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      byteLength += result.value.byteLength;
      if (byteLength > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ExpectedError("invalid_input", "The source response is too large to import.");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function safeFetchImportSource(
  input: string,
  acceptedContent: "json" | "html",
): Promise<{ text: string; finalUrl: string }> {
  let url = assertSafeImportUrl(input);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: acceptedContent === "json" ? "application/json" : "text/html" },
        redirect: "manual",
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location || redirects === MAX_REDIRECTS) {
          throw new ExpectedError("invalid_input", "The job source redirected too many times.");
        }
        url = assertSafeImportUrl(new URL(location, url).toString());
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new ExpectedError(
          "conflict",
          response.status === 404
            ? "No public job board was found at that URL."
            : "The job source could not be read right now.",
        );
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      const validContentType =
        acceptedContent === "json"
          ? contentType.includes("json") || contentType === ""
          : contentType.includes("html") || contentType.includes("text/plain");
      if (!validContentType) {
        await response.body?.cancel();
        throw new ExpectedError("invalid_input", "That URL did not return supported job data.");
      }

      return { text: await readBoundedText(response), finalUrl: url.toString() };
    } catch (error) {
      if (error instanceof ExpectedError) throw error;
      if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        throw new ExpectedError("conflict", "The job source took too long to respond.");
      }
      throw new ExpectedError("conflict", "RoundZero could not reach that job source.");
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ExpectedError("invalid_input", "The job source could not be read.");
}
