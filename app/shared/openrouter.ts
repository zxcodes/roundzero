import { env } from "cloudflare:workers";
import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { isProd, isStaging } from "./env.app";

// Single cached provider instance per Worker isolate.
let cachedProvider: OpenRouterProvider | null = null;

/**
 * Returns an OpenRouter provider configured to route through Cloudflare AI Gateway
 * when both `CLOUDFLARE_ACCOUNT_ID` and `AI_GATEWAY_ID` are set. Otherwise it falls
 * back to OpenRouter's default endpoint.
 *
 * Auth model (per Cloudflare + OpenRouter docs):
 *   - `Authorization: Bearer ${OPENROUTER_API_KEY}` is sent upstream to OpenRouter
 *     (handled by the SDK).
 *   - When the gateway has "Authenticated Gateway" enabled, requests must also
 *     include `cf-aig-authorization: Bearer ${AI_GATEWAY_TOKEN}`. We attach it
 *     here when the env var is set so callers don't have to think about it.
 *
 * Reference:
 *   https://developers.cloudflare.com/ai-gateway/usage/providers/openrouter/
 *   https://developers.cloudflare.com/ai-gateway/configuration/authentication/
 */
export function getOpenRouter(): OpenRouterProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required to call OpenRouter models");
  }

  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const gatewayId = env.AI_GATEWAY_ID;
  // AI_GATEWAY_TOKEN is optional — only required when the gateway has
  // "Authenticated Gateway" enabled. Not declared in the worker types so
  // it doesn't have to be set in every environment.
  const gatewayToken = env.AI_GATEWAY_TOKEN;

  const baseURL =
    accountId && gatewayId
      ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/openrouter`
      : undefined;

  const headers: Record<string, string> = {
    // OpenRouter ranking headers — surface the app in OpenRouter analytics.
    "HTTP-Referer": env.APP_URL ?? "https://roundzero.dev",
    "X-Title": "RoundZero",
  };

  if (gatewayToken) {
    headers["cf-aig-authorization"] = `Bearer ${gatewayToken}`;
  }

  cachedProvider = createOpenRouter({
    apiKey,
    baseURL,
    headers,
  });

  return cachedProvider;
}

// ─── Model Chains ───────────────────────────────────────────────────────────
//
// Model selection is code-level, not infra-level. Change these arrays in code
// when you want to switch models. LOCAL_DEV_PAID_MODEL overrides the dev
// default (openrouter/free) for local debugging with a paid model.
//
// Each chain is ordered: [primary, fallback1, ...]. The primary is passed to
// `openrouter.chat(model)`. The rest are passed as `models` in the chat settings
// so OpenRouter auto-failovers on errors (429, downtime, moderation refusal).
//
// The `models` array must NOT include the primary (per OpenRouter docs).
//
// https://openrouter.ai/docs/guides/routing/model-fallbacks

type Task = "pre_eval" | "post_eval" | "post_eval_audit" | "interview" | "job_creation";

const MODEL_CHAINS = {
  pre_eval: {
    dev: ["openrouter/free"],
    staging: ["deepseek/deepseek-v4-flash"],
    prod: ["anthropic/claude-sonnet-4.5", "anthropic/claude-haiku-4.5"],
  },
  post_eval: {
    dev: ["openrouter/free"],
    staging: ["deepseek/deepseek-v4-flash"],
    prod: ["anthropic/claude-sonnet-4.5", "anthropic/claude-haiku-4.5"],
  },
  // Audit uses a different model family than post_eval to catch biases.
  post_eval_audit: {
    dev: ["openrouter/free"],
    staging: ["deepseek/deepseek-v4-flash"],
    prod: ["anthropic/claude-sonnet-4.5", "anthropic/claude-haiku-4.5"],
  },
  interview: {
    dev: ["meta-llama/llama-3.3-70b-instruct:free", "google/gemini-2.5-flash"],
    staging: ["deepseek/deepseek-v4-flash"],
    prod: ["anthropic/claude-sonnet-4.5", "anthropic/claude-haiku-4.5"],
  },
  job_creation: {
    dev: ["openrouter/free"],
    staging: ["deepseek/deepseek-v4-flash"],
    prod: ["anthropic/claude-sonnet-4.5", "anthropic/claude-haiku-4.5"],
  },
} as const satisfies Record<
  Task,
  { dev: readonly string[]; staging: readonly string[]; prod: readonly string[] }
>;

/**
 * Returns the primary model id and fallback list for a given AI task.
 *
 * `model`      — primary model id.
 * `fallbacks`  — ordered list of fallback models tried by OpenRouter when the
 *                primary errors. Must NOT include the primary model.
 */
export function getModelChain<TTask extends Task>(
  task: TTask,
): {
  model:
    | (typeof MODEL_CHAINS)[TTask]["dev"][number]
    | (typeof MODEL_CHAINS)[TTask]["staging"][number]
    | (typeof MODEL_CHAINS)[TTask]["prod"][number];
  fallbacks: Array<
    | (typeof MODEL_CHAINS)[TTask]["dev"][number]
    | (typeof MODEL_CHAINS)[TTask]["staging"][number]
    | (typeof MODEL_CHAINS)[TTask]["prod"][number]
  >;
} {
  const env = isProd ? "prod" : isStaging ? "staging" : "dev";
  const chain = MODEL_CHAINS[task][env];
  return { model: chain[0], fallbacks: [...chain.slice(1)] };
}

/**
 * Returns a pre-configured Vercel AI SDK language model for the given task,
 * with the OpenRouter fallback chain baked into the model settings.
 *
 * Use this instead of calling `openrouter.chat()` directly — it wires up the
 * `models` fallback array correctly (as a chat setting, not providerOptions).
 *
 * `plugins` — optional Response Healing or other OpenRouter plugins.
 */
export function createChatModel(
  task: Task,
  options?: { plugins?: Array<{ id: "response-healing" }> },
): ReturnType<ReturnType<typeof getOpenRouter>["chat"]> {
  const openrouter = getOpenRouter();
  const { model, fallbacks } = getModelChain(task);
  return openrouter.chat(model, {
    ...(fallbacks.length > 0 ? { models: fallbacks } : {}),
    ...options,
  });
}
