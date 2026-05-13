import { env } from "cloudflare:workers";
import { getAgentByName } from "agents";

type VoiceAgentStub = {
  initialize(): Promise<{ ok: true; status: string }>;
  markEndIntent(): Promise<{ ok: true }>;
  getTranscript(): Promise<{ messages: Array<{ role: string; content: string }> }>;
  skip(): Promise<{ ok: true }>;
};

const createVoiceAgentStub = async (interviewId: string): Promise<VoiceAgentStub> => {
  return (await getAgentByName(
    // biome-ignore lint/suspicious/noExplicitAny: binding not fully typed until wrangler types is rerun
    env.VOICE_ASSESSMENT_AGENT as any,
    interviewId,
  )) as unknown as VoiceAgentStub;
};

export const initializeVoiceAssessmentAgent = async (interviewId: string) => {
  const stub = await createVoiceAgentStub(interviewId);
  return await stub.initialize();
};

export const markVoiceAssessmentEndIntent = async (interviewId: string) => {
  const stub = await createVoiceAgentStub(interviewId);
  return await stub.markEndIntent();
};

export const getVoiceAssessmentTranscript = async (interviewId: string) => {
  const stub = await createVoiceAgentStub(interviewId);
  return await stub.getTranscript();
};

export const skipVoiceAssessmentAgent = async (interviewId: string) => {
  const stub = await createVoiceAgentStub(interviewId);
  return await stub.skip();
};
