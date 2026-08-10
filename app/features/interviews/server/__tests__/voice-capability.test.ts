import { describe, expect, it } from "vitest";

import {
  createVoiceCapability,
  getVoiceAgentPath,
  getVoiceCapabilityCookieName,
  readCookieValue,
  verifyVoiceCapability,
  VOICE_CAPABILITY_TTL_MS,
} from "@/features/interviews/server/voice-capability";

const secret = "a-voice-capability-secret-with-32-characters";
const candidateId = "2ef0a4fb-63ac-4532-9f90-ed42e481401c";
const interviewId = "19e12a1c-58eb-4649-a6ba-216898479fd1";
const otherInterviewId = "baf9f02d-9ad8-4ce1-b658-335217e62288";
const now = 1_786_255_200_000;

describe("voice capability", () => {
  it("round trips valid scoped claims", async () => {
    const capability = await createVoiceCapability({ secret, candidateId, interviewId, now });
    const claims = await verifyVoiceCapability({
      token: capability.token,
      secret,
      interviewId,
      now: now + 1,
    });

    expect(claims).toEqual({
      version: 1,
      candidateId,
      interviewId,
      iat: now,
      exp: now + VOICE_CAPABILITY_TTL_MS,
    });
    expect(capability.expiresAt).toBe(now + VOICE_CAPABILITY_TTL_MS);
  });

  it("rejects a tampered payload or signature", async () => {
    const capability = await createVoiceCapability({ secret, candidateId, interviewId, now });
    const [payload, signature] = capability.token.split(".");

    await expect(
      verifyVoiceCapability({
        token: `${payload}a.${signature}`,
        secret,
        interviewId,
        now,
      }),
    ).resolves.toBeNull();
    await expect(
      verifyVoiceCapability({
        token: `${payload}.${signature}a`,
        secret,
        interviewId,
        now,
      }),
    ).resolves.toBeNull();
  });

  it("rejects expired and cross-interview tokens", async () => {
    const capability = await createVoiceCapability({ secret, candidateId, interviewId, now });

    await expect(
      verifyVoiceCapability({
        token: capability.token,
        secret,
        interviewId,
        now: now + VOICE_CAPABILITY_TTL_MS,
      }),
    ).resolves.toBeNull();
    await expect(
      verifyVoiceCapability({
        token: capability.token,
        secret,
        interviewId: otherInterviewId,
        now,
      }),
    ).resolves.toBeNull();
  });

  it("rejects malformed encodings and different-length signatures safely", async () => {
    const capability = await createVoiceCapability({ secret, candidateId, interviewId, now });
    const [payload] = capability.token.split(".");

    await expect(
      verifyVoiceCapability({ token: "%%%.$$$", secret, interviewId, now }),
    ).resolves.toBeNull();
    await expect(
      verifyVoiceCapability({ token: `${payload}.AA`, secret, interviewId, now }),
    ).resolves.toBeNull();
  });

  it("requires a high-entropy session secret", async () => {
    await expect(
      createVoiceCapability({ secret: "too-short", candidateId, interviewId, now }),
    ).rejects.toThrow("SESSION_SECRET must be at least 32 characters");
  });

  it("builds an interview-scoped cookie name and path", () => {
    expect(getVoiceCapabilityCookieName(interviewId)).toBe(`rz-voice-${interviewId}`);
    expect(getVoiceAgentPath(interviewId)).toBe(`/agents/voice-assessment-agent/${interviewId}`);
  });

  it("reads only the exact cookie name", () => {
    const name = getVoiceCapabilityCookieName(interviewId);
    const header = `other=value; ${name}=payload.signature; ${name}-other=wrong`;

    expect(readCookieValue(header, name)).toBe("payload.signature");
    expect(readCookieValue(header, "missing")).toBeNull();
  });
});
