import { getAgentByName } from "agents";

const createAgentStub = async (env: Env, interviewId: string) => {
  return await getAgentByName(env.INTERVIEW_AGENT, interviewId);
};

export const initializeInterviewAgent = async (
  env: Env,
  input: {
    interviewId: string;
    applicationId: string;
    interviewType: "full" | "quick_eval";
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    jobRequirements: string[];
    candidateSummary: string;
    customQuestions: string[];
    preEvaluation: {
      score: number | null;
      missingRequirements: string[];
      consistencyScore: number | null;
    };
  },
) => {
  const stub = await createAgentStub(env, input.interviewId);
  return await stub.initializeContext(input);
};

export const cancelInterviewAgentSession = async (env: Env, interviewId: string) => {
  const stub = await createAgentStub(env, interviewId);
  return await stub.cancelInterview();
};

export const markInterviewAgentStarted = async (env: Env, interviewId: string) => {
  const stub = await createAgentStub(env, interviewId);
  return await stub.markStarted();
};

export const getInterviewAgentState = async (env: Env, interviewId: string) => {
  const stub = await createAgentStub(env, interviewId);
  return await stub.getInterviewState();
};
