import { env } from "cloudflare:workers";
import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { isProd, isStaging } from "./env.app";

let provider: OpenRouterProvider | null = null;

function getProvider(): OpenRouterProvider {
  if (provider) {
    return provider;
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required to call OpenRouter models");
  }

  const baseURL =
    env.CLOUDFLARE_ACCOUNT_ID && env.AI_GATEWAY_ID
      ? `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/openrouter`
      : undefined;

  const headers: Record<string, string> = {
    "HTTP-Referer": env.APP_URL,
    "X-Title": "RoundZero",
  };
  if (env.AI_GATEWAY_TOKEN) {
    headers["cf-aig-authorization"] = `Bearer ${env.AI_GATEWAY_TOKEN}`;
  }

  provider = createOpenRouter({ apiKey, baseURL, headers });
  return provider;
}

type Task =
  | "pre_eval"
  | "post_eval"
  | "post_eval_audit"
  | "interview"
  | "job_creation"
  | "answer_authenticity";

type EnvKey = "dev" | "staging" | "prod";
type ModelId<T extends Task> =
  | (typeof MODEL_CHAINS)[T]["dev"][number]
  | (typeof MODEL_CHAINS)[T]["staging"][number]
  | (typeof MODEL_CHAINS)[T]["prod"][number];

const currentEnv = (): EnvKey => (isProd ? "prod" : isStaging ? "staging" : "dev");

const DEFAULT_CHAIN = {
  dev: ["openrouter/free"],
  staging: ["deepseek/deepseek-v4-flash"],
  prod: ["anthropic/claude-sonnet-4.5", "anthropic/claude-haiku-4.5"],
} as const;

// [primary, ...fallbacks] — fallbacks are passed as OpenRouter `models`, not the primary.
const MODEL_CHAINS = {
  pre_eval: DEFAULT_CHAIN,
  post_eval: DEFAULT_CHAIN,
  post_eval_audit: DEFAULT_CHAIN,
  job_creation: DEFAULT_CHAIN,
  interview: {
    dev: ["meta-llama/llama-3.3-70b-instruct:free"],
    staging: ["deepseek/deepseek-v4-flash"],
    prod: ["anthropic/claude-sonnet-4.5", "anthropic/claude-haiku-4.5"],
  },
  answer_authenticity: {
    dev: DEFAULT_CHAIN.dev,
    staging: DEFAULT_CHAIN.staging,
    prod: ["anthropic/claude-sonnet-4.5", "anthropic/claude-haiku-4.5"],
  },
} as const satisfies Record<
  Task,
  { dev: readonly string[]; staging: readonly string[]; prod: readonly string[] }
>;

export function getModelChain<T extends Task>(
  task: T,
): { model: ModelId<T>; fallbacks: ModelId<T>[] } {
  const chain = MODEL_CHAINS[task][currentEnv()];
  return { model: chain[0], fallbacks: [...chain.slice(1)] };
}

export function createChatModel(
  task: Task,
  options?: { plugins?: Array<{ id: "response-healing" }> },
) {
  const { model, fallbacks } = getModelChain(task);
  return getProvider().chat(model, {
    ...(fallbacks.length > 0 ? { models: fallbacks } : {}),
    ...options,
  });
}
