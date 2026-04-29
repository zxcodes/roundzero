const encoder = new TextEncoder();

const toHex = (value: ArrayBuffer) => {
  const bytes = new Uint8Array(value);
  let output = "";

  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, "0");
  }

  return output;
};

const fromHex = (value: string) => {
  if (value.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(value.length / 2);

  for (let i = 0; i < value.length; i += 2) {
    const byte = Number.parseInt(value.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      return null;
    }
    bytes[i / 2] = byte;
  }

  return bytes;
};

const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
};

const signPayload = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(signature);
};

export const createInterviewAgentAccessToken = async (input: {
  interviewId: string;
  candidateId: string;
  secret: string;
  ttlSeconds?: number;
}) => {
  const expiresAt = Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 900);
  const payload = `${input.interviewId}:${input.candidateId}:${expiresAt}`;
  const signature = await signPayload(payload, input.secret);
  return `${input.candidateId}.${expiresAt}.${signature}`;
};

export const verifyInterviewAgentAccessToken = async (input: {
  token: string;
  interviewId: string;
  secret: string;
}) => {
  const [candidateId, expiresAtRaw, signature] = input.token.split(".");
  if (!candidateId || !expiresAtRaw || !signature) {
    return null;
  }

  const expiresAt = Number.parseInt(expiresAtRaw, 10);
  if (!Number.isFinite(expiresAt)) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now) {
    return null;
  }

  const payload = `${input.interviewId}:${candidateId}:${expiresAt}`;
  const expectedSignature = await signPayload(payload, input.secret);

  const expectedBytes = fromHex(expectedSignature);
  const receivedBytes = fromHex(signature);
  if (!expectedBytes || !receivedBytes) {
    return null;
  }

  if (!timingSafeEqual(expectedBytes, receivedBytes)) {
    return null;
  }

  return { candidateId, expiresAt };
};
