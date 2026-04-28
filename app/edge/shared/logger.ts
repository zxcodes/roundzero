export function createWorkflowLogger(workflowName: string, applicationId: string) {
  const prefix = `[${workflowName}:${applicationId.slice(0, 8)}]`;
  return {
    step: (stepName: string, message: string) => {
      console.log(`${prefix} [${stepName}] ${message}`);
    },
    info: (message: string) => {
      console.log(`${prefix} [INFO] ${message}`);
    },
    warn: (message: string) => {
      console.warn(`${prefix} [WARN] ${message}`);
    },
    error: (message: string, error?: unknown) => {
      console.error(`${prefix} [ERROR] ${message}`, error);
    },
    result: (stepName: string, data: Record<string, unknown>) => {
      const entries = Object.entries(data)
        .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(", ");
      console.log(`${prefix} [${stepName}] -> ${entries}`);
    },
    ai: (promptLength: number, responseTokens: number, latencyMs: number) => {
      console.log(
        `${prefix} [AI] prompt=${promptLength} tokens response=${responseTokens} tokens latency=${latencyMs}ms`,
      );
    },
  };
}
