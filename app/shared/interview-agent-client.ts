import { env } from "cloudflare:workers";

const createAgentStub = async (interviewId: string) => {
  return env.INTERVIEW_AGENT.getByName(interviewId);
};

export const initializeInterviewAgent = async (interviewId: string) => {
  const stub = await createAgentStub(interviewId);
  return await stub.initializeContext({ interviewId });
};

export const markInterviewAgentStarted = async (interviewId: string) => {
  const stub = await createAgentStub(interviewId);
  const started = await stub.markStarted({ interviewId });

  if (!started.started) {
    return { started: false, greeted: false };
  }

  const greeted = await stub.kickoff({ interviewId });
  return { started: started.started, greeted: greeted.greeted };
};

export const getInterviewAgentState = async (interviewId: string) => {
  const stub = await createAgentStub(interviewId);
  return await stub.getInterviewState({ interviewId });
};
