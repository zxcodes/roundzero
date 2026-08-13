import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import type { createOpenRouterText } from "@tanstack/ai-openrouter";
import { env } from "cloudflare:workers";

import { isProd, isStaging } from "./env.app";

// Prod chains often hit Anthropic/Bedrock first. Schemas passed to Output.object()
// must follow app/shared/llm-schema.ts (no z.number().min/.max/.positive in generation schemas).

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
  | "job_import"
  | "job_matching"
  | "answer_authenticity";

type EnvKey = "dev" | "staging" | "prod";

// @tanstack/ai-openrouter's generated union lags some OpenRouter slugs (e.g. openrouter/free).
// Cast at this boundary so createOpenRouterText / modelOptions.models accept our chains.
type OpenRouterTextModel = Parameters<typeof createOpenRouterText>[0];

const currentEnv = (): EnvKey => (isProd ? "prod" : isStaging ? "staging" : "dev");

const DEFAULT_CHAIN = {
  dev: ["openrouter/free"],
  staging: ["deepseek/deepseek-v4-flash"],
  // Cross-provider final fallback (Gemini) so an Anthropic-family outage or
  // moderation refusal doesn't stall the pipeline.
  prod: ["anthropic/claude-sonnet-4.5", "anthropic/claude-haiku-4.5", "google/gemini-2.5-pro"],
} as const;

// [primary, ...fallbacks] — fallbacks are passed as OpenRouter `models`, not the primary.
const MODEL_CHAINS = {
  pre_eval: DEFAULT_CHAIN,
  post_eval: DEFAULT_CHAIN,
  // Audit uses a different model family than post_eval so it can catch
  // model-specific biases, with an Anthropic fallback for resilience.
  post_eval_audit: DEFAULT_CHAIN,
  job_creation: DEFAULT_CHAIN,
  job_import: DEFAULT_CHAIN,
  job_matching: DEFAULT_CHAIN,
  interview: DEFAULT_CHAIN,
  // Cheap, high-frequency slop / AI-detection check — Haiku only in prod.
  answer_authenticity: DEFAULT_CHAIN,
} as const satisfies Record<
  Task,
  { dev: readonly string[]; staging: readonly string[]; prod: readonly string[] }
>;

export function getModelChain(task: Task): {
  model: OpenRouterTextModel;
  fallbacks: OpenRouterTextModel[];
} {
  const chain = MODEL_CHAINS[task][currentEnv()];
  return {
    model: chain[0] as OpenRouterTextModel,
    fallbacks: chain.slice(1) as OpenRouterTextModel[],
  };
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
