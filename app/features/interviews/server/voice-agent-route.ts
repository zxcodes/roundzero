import { z } from "zod";

import {
  getVoiceCapabilityCookieName,
  readCookieValue,
  verifyVoiceCapability,
} from "@/features/interviews/server/voice-capability";

const interviewIdSchema = z.string().uuid();

type AuthorizedVoiceAgentRequest = {
  interviewId: string;
  candidateId: string;
};

function reject(status: 401 | 403 | 404) {
  return new Response(status === 404 ? "Not found" : "Unauthorized", { status });
}

function readInterviewId(pathname: string) {
  const segments = pathname.split("/");
  if (
    segments.length !== 4 ||
    segments[0] !== "" ||
    segments[1] !== "agents" ||
    segments[2] !== "voice-assessment-agent"
  ) {
    return null;
  }

  const parsed = interviewIdSchema.safeParse(segments[3]);
  return parsed.success ? parsed.data : null;
}

export async function authorizeVoiceAgentUpgrade(input: {
  request: Request;
  appUrl: string;
  sessionSecret: string;
  authorizeCandidate: (input: AuthorizedVoiceAgentRequest) => Promise<boolean>;
}): Promise<AuthorizedVoiceAgentRequest | Response> {
  const url = new URL(input.request.url);
  const interviewId = readInterviewId(url.pathname);
  if (!interviewId) return reject(404);

  if (
    input.request.method !== "GET" ||
    input.request.headers.get("Upgrade")?.toLowerCase() !== "websocket"
  ) {
    return reject(404);
  }

  if (input.request.headers.get("Origin") !== new URL(input.appUrl).origin) {
    return reject(403);
  }

  const token = readCookieValue(
    input.request.headers.get("Cookie"),
    getVoiceCapabilityCookieName(interviewId),
  );
  if (!token) return reject(401);

  const claims = await verifyVoiceCapability({
    token,
    secret: input.sessionSecret,
    interviewId,
  });
  if (!claims) return reject(401);

  const authorized = await input.authorizeCandidate({
    interviewId,
    candidateId: claims.candidateId,
  });
  if (!authorized) return reject(404);

  return { interviewId, candidateId: claims.candidateId };
}
