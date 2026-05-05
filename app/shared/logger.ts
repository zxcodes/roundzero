export function createWorkflowLogger(workflowName: string, applicationId: string) {
  const base = {
    workflow: workflowName,
    applicationId: applicationId.slice(0, 8),
  };

  const isProd = typeof process !== "undefined" ? process.env.NODE_ENV === "production" : true;

  // ANSI colors (dev only)
  const colors = {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
  };

  function colorize(level: string, text: string) {
    if (isProd) return text;

    switch (level) {
      case "info":
        return `${colors.green}${text}${colors.reset}`;
      case "warn":
        return `${colors.yellow}${text}${colors.reset}`;
      case "error":
        return `${colors.red}${text}${colors.reset}`;
      default:
        return `${colors.cyan}${text}${colors.reset}`;
    }
  }

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
    const prefix = `${colors.dim}[${base.workflow}:${base.applicationId}]${colors.reset}`;

    const levelTag = colorize(level, `[${level.toUpperCase()}]`);
    let line = `${prefix} ${levelTag} ${message}`;

    if (extra) {
      const rest = Object.entries(extra)
        .map(([k, v]) => (typeof v === "string" ? `${k}=${v}` : `${k}=${safeStringify(v)}`))
        .join(" ");

      if (rest) {
        line += ` ${colors.magenta}→${colors.reset} ${rest}`;
      }
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
      write("info", `${colors.cyan}${stepName}${colors.reset}: ${message}`);
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
      write("info", `${colors.green}${stepName} completed${colors.reset}`, data);
    },

    ai: (promptLength: number, responseTokens: number, latencyMs: number) => {
      write("info", `${colors.magenta}AI call${colors.reset}`, {
        prompt: promptLength,
        tokens: responseTokens,
        latencyMs,
      });
    },
  };
}
