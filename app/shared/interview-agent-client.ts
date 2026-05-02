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

export const markInterviewAgentStarted = async (env: Env, interviewId: string) => {
  const stub = await createAgentStub(env, interviewId);
  const started = await stub.markStarted({ interviewId });

  if (!started.started) {
    return { started: false, greeted: false };
  }

  const greeted = await stub.kickoff({ interviewId });
  return { started: started.started, greeted: greeted.greeted };
};

export const getInterviewAgentState = async (env: Env, interviewId: string) => {
  const stub = await createAgentStub(env, interviewId);
  return await stub.getInterviewState({ interviewId });
};
