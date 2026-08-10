import { z } from "zod";

const VOICE_CAPABILITY_VERSION = 1;
const VOICE_CAPABILITY_DOMAIN = "roundzero:voice-capability:v1";

export const VOICE_CAPABILITY_TTL_MS = 30 * 60 * 1000;

const voiceCapabilityClaimsSchema = z
  .object({
    version: z.literal(VOICE_CAPABILITY_VERSION),
    candidateId: z.string().uuid(),
    interviewId: z.string().uuid(),
    iat: z.number().int().nonnegative(),
    exp: z.number().int().positive(),
  })
  .strict();

export type VoiceCapabilityClaims = z.infer<typeof voiceCapabilityClaimsSchema>;

const textEncoder = new TextEncoder();

function assertSecret(secret: string) {
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) {
    throw new Error("Malformed base64url");
  }

  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importSigningKey(secret: string) {
  assertSecret(secret);
  return await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function getSigningInput(payload: string) {
  return textEncoder.encode(`${VOICE_CAPABILITY_DOMAIN}.${payload}`);
}

export function getVoiceAgentPath(interviewId: string) {
  return `/agents/voice-assessment-agent/${interviewId}`;
}

export function getVoiceCapabilityCookieName(interviewId: string) {
  return `rz-voice-${interviewId}`;
}

export function readCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() !== name) continue;
    return pair.slice(separator + 1).trim() || null;
  }

  return null;
}

export async function createVoiceCapability(input: {
  secret: string;
  candidateId: string;
  interviewId: string;
  now?: number;
}) {
  const issuedAt = input.now ?? Date.now();
  const claims = voiceCapabilityClaimsSchema.parse({
    version: VOICE_CAPABILITY_VERSION,
    candidateId: input.candidateId,
    interviewId: input.interviewId,
    iat: issuedAt,
    exp: issuedAt + VOICE_CAPABILITY_TTL_MS,
  });
  const payload = encodeBase64Url(textEncoder.encode(JSON.stringify(claims)));
  const key = await importSigningKey(input.secret);
  const signature = await crypto.subtle.sign("HMAC", key, getSigningInput(payload));

  return {
    token: `${payload}.${encodeBase64Url(new Uint8Array(signature))}`,
    expiresAt: claims.exp,
  };
}

export async function verifyVoiceCapability(input: {
  token: string;
  secret: string;
  interviewId: string;
  now?: number;
}): Promise<VoiceCapabilityClaims | null> {
  try {
    const segments = input.token.split(".");
    if (segments.length !== 2) return null;

    const [payload, encodedSignature] = segments;
    if (!payload || !encodedSignature) return null;

    const key = await importSigningKey(input.secret);
    const signature = decodeBase64Url(encodedSignature);
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      getSigningInput(payload),
    );
    if (!validSignature) return null;

    const claims = voiceCapabilityClaimsSchema.safeParse(
      JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))),
    );
    if (!claims.success) return null;

    const now = input.now ?? Date.now();
    if (claims.data.exp <= now || claims.data.exp <= claims.data.iat) return null;
    if (claims.data.interviewId !== input.interviewId) return null;

    return claims.data;
  } catch {
    return null;
  }
}
