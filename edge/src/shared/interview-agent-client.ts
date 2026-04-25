const createAgentStub = (env: Env, interviewId: string) => {
  return env.INTERVIEW_AGENT.getByName(interviewId);
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
  const stub = createAgentStub(env, input.interviewId);
  return await stub.init(input);
};

export const startInterviewAgentSession = async (env: Env, interviewId: string) => {
  const stub = createAgentStub(env, interviewId);
  return await stub.start();
};

export const addInterviewAgentMessage = async (env: Env, interviewId: string, content: string) => {
  const stub = createAgentStub(env, interviewId);
  return await stub.message({ content });
};

export const completeInterviewAgentSession = async (env: Env, interviewId: string) => {
  const stub = createAgentStub(env, interviewId);
  return await stub.complete();
};

export const cancelInterviewAgentSession = async (env: Env, interviewId: string) => {
  const stub = createAgentStub(env, interviewId);
  return await stub.cancel();
};

export const getInterviewAgentState = async (env: Env, interviewId: string) => {
  const stub = createAgentStub(env, interviewId);
  return await stub.state();
};
