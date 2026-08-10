import { describe, expect, it, vi } from "vitest";

import { authorizeVoiceAgentUpgrade } from "@/features/interviews/server/voice-agent-route";
import {
  createVoiceCapability,
  getVoiceAgentPath,
  getVoiceCapabilityCookieName,
} from "@/features/interviews/server/voice-capability";

const appUrl = "https://app.tryroundzero.com";
const secret = "a-voice-capability-secret-with-32-characters";
const candidateId = "2ef0a4fb-63ac-4532-9f90-ed42e481401c";
const interviewId = "19e12a1c-58eb-4649-a6ba-216898479fd1";

async function createRequest(overrides?: {
  path?: string;
  method?: string;
  origin?: string | null;
  token?: string | null;
  cookieInterviewId?: string;
}) {
  const capability = await createVoiceCapability({ secret, candidateId, interviewId });
  const token = overrides?.token === undefined ? capability.token : overrides.token;
  const headers = new Headers({ Upgrade: "websocket" });
  if (overrides?.origin !== null) {
    headers.set("Origin", overrides?.origin ?? appUrl);
  }
  if (token) {
    headers.set(
      "Cookie",
      `${getVoiceCapabilityCookieName(overrides?.cookieInterviewId ?? interviewId)}=${token}`,
    );
  }

  return new Request(`${appUrl}${overrides?.path ?? getVoiceAgentPath(interviewId)}`, {
    method: overrides?.method ?? "GET",
    headers,
  });
}

describe("voice Agent route authorization", () => {
  it("authorizes the exact scoped WebSocket request", async () => {
    const authorizeCandidate = vi.fn(async () => true);
    const request = await createRequest();

    const result = await authorizeVoiceAgentUpgrade({
      request,
      appUrl,
      sessionSecret: secret,
      authorizeCandidate,
    });

    expect(result).toEqual({ interviewId, candidateId });
    expect(authorizeCandidate).toHaveBeenCalledWith({ interviewId, candidateId });
  });

  it.each([
    "/agents/voice-assessment-agent/default",
    `/agents/VoiceAssessmentAgent/${interviewId}`,
    `/agents/voice-assessment-agent/${interviewId}/rpc`,
    "/agents/other-agent/19e12a1c-58eb-4649-a6ba-216898479fd1",
  ])("rejects an unrecognized Agent path: %s", async (path) => {
    const result = await authorizeVoiceAgentUpgrade({
      request: await createRequest({ path }),
      appUrl,
      sessionSecret: secret,
      authorizeCandidate: vi.fn(async () => true),
    });

    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) throw new Error("Expected a rejected response");
    expect(result.status).toBe(404);
  });

  it("rejects non-WebSocket requests", async () => {
    const request = await createRequest({ method: "POST" });
    const result = await authorizeVoiceAgentUpgrade({
      request,
      appUrl,
      sessionSecret: secret,
      authorizeCandidate: vi.fn(async () => true),
    });

    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) throw new Error("Expected a rejected response");
    expect(result.status).toBe(404);
  });

  it.each([null, "https://evil.example"])("rejects an invalid Origin: %s", async (origin) => {
    const result = await authorizeVoiceAgentUpgrade({
      request: await createRequest({ origin }),
      appUrl,
      sessionSecret: secret,
      authorizeCandidate: vi.fn(async () => true),
    });

    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) throw new Error("Expected a rejected response");
    expect(result.status).toBe(403);
  });

  it("rejects a missing capability without querying authorization", async () => {
    const authorizeCandidate = vi.fn(async () => true);
    const result = await authorizeVoiceAgentUpgrade({
      request: await createRequest({ token: null }),
      appUrl,
      sessionSecret: secret,
      authorizeCandidate,
    });

    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) throw new Error("Expected a rejected response");
    expect(result.status).toBe(401);
    expect(authorizeCandidate).not.toHaveBeenCalled();
  });

  it("rejects a capability whose interview claim differs from the path", async () => {
    const otherInterviewId = "baf9f02d-9ad8-4ce1-b658-335217e62288";
    const result = await authorizeVoiceAgentUpgrade({
      request: await createRequest({
        path: getVoiceAgentPath(otherInterviewId),
        cookieInterviewId: otherInterviewId,
      }),
      appUrl,
      sessionSecret: secret,
      authorizeCandidate: vi.fn(async () => true),
    });

    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) throw new Error("Expected a rejected response");
    expect(result.status).toBe(401);
  });

  it("returns not found when fresh ownership or lifecycle authorization fails", async () => {
    const result = await authorizeVoiceAgentUpgrade({
      request: await createRequest(),
      appUrl,
      sessionSecret: secret,
      authorizeCandidate: vi.fn(async () => false),
    });

    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) throw new Error("Expected a rejected response");
    expect(result.status).toBe(404);
  });
});
