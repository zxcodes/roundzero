export function createWorkflowLogger(workflowName: string, applicationId: string) {
  const base = {
    workflow: workflowName,
    applicationId: applicationId.slice(0, 8),
  };

  const isProd = typeof process !== "undefined" ? process.env.NODE_ENV === "production" : true; // Workers → assume prod

  function ts() {
    return new Date().toISOString();
  }

  function serializeError(err: unknown) {
    if (err instanceof Error) {
      return {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
    }
    return err;
  }

  function safeStringify(obj: unknown): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return JSON.stringify({ error: "Failed to serialize log payload" });
    }
  }

  function pretty(level: string, message: string, extra?: Record<string, unknown>) {
    const prefix = `[${base.workflow}:${base.applicationId}]`;

    let line = `${prefix} [${level.toUpperCase()}] ${message}`;

    if (extra) {
      const rest = Object.entries(extra)
        .map(([k, v]) => (typeof v === "string" ? `${k}=${v}` : `${k}=${safeStringify(v)}`))
        .join(" ");

      if (rest) line += ` → ${rest}`;
    }

    return line;
  }

  function write(
    level: "log" | "info" | "warn" | "error",
    message: string,
    extra?: Record<string, unknown>,
  ) {
    if (isProd) {
      const payload = {
        timestamp: ts(),
        level,
        message,
        ...base,
        ...(extra ?? {}),
      };

      console[level](safeStringify(payload));
    } else {
      console[level](pretty(level, message, extra));
    }
  }

  return {
    step: (stepName: string, message: string) => {
      write("info", `${stepName}: ${message}`);
    },

    info: (message: string) => {
      write("info", message);
    },

    warn: (message: string) => {
      write("warn", message);
    },

    error: (message: string, error?: unknown) => {
      write("error", message, {
        error: serializeError(error),
      });
    },

    result: (stepName: string, data: Record<string, unknown>) => {
      write("info", `${stepName} completed`, data);
    },

    ai: (promptLength: number, responseTokens: number, latencyMs: number) => {
      write("info", "AI call", {
        prompt: promptLength,
        tokens: responseTokens,
        latencyMs,
      });
    },
  };
}
