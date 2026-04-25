const agentBaseUrl = "https://interview-agent";

const createAgentStub = (env: Env, interviewId: string) => {
  const durableObjectId = env.INTERVIEW_AGENT.idFromName(interviewId);
  return env.INTERVIEW_AGENT.get(durableObjectId);
};

const postAgentJson = async <TBody extends object>(
  env: Env,
  interviewId: string,
  path: string,
  body: TBody,
) => {
  const stub = createAgentStub(env, interviewId);
  const response = await stub.fetch(`${agentBaseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Interview agent request failed (${response.status}): ${text}`);
  }

  return await response.json();
};

const getAgentJson = async (env: Env, interviewId: string, path: string) => {
  const stub = createAgentStub(env, interviewId);
  const response = await stub.fetch(`${agentBaseUrl}${path}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Interview agent request failed (${response.status}): ${text}`);
  }

  return await response.json();
};

export const initializeInterviewAgent = async (
  env: Env,
  input: {
    interviewId: string;
    applicationId: string;
    interviewType: "full" | "quick_eval";
    jobTitle: string;
    companyName: string;
  },
) => {
  return await postAgentJson(env, input.interviewId, "/init", input);
};

export const startInterviewAgentSession = async (env: Env, interviewId: string) => {
  return await postAgentJson(env, interviewId, "/start", {});
};

export const addInterviewAgentMessage = async (env: Env, interviewId: string, content: string) => {
  return await postAgentJson(env, interviewId, "/message", { content });
};

export const completeInterviewAgentSession = async (env: Env, interviewId: string) => {
  return await postAgentJson(env, interviewId, "/complete", {});
};

export const cancelInterviewAgentSession = async (env: Env, interviewId: string) => {
  return await postAgentJson(env, interviewId, "/cancel", {});
};

export const getInterviewAgentState = async (env: Env, interviewId: string) => {
  return await getAgentJson(env, interviewId, "/state");
};
