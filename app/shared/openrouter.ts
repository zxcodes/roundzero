import { env } from "cloudflare:workers";
import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";

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
  const gatewayToken = (env as { AI_GATEWAY_TOKEN?: string }).AI_GATEWAY_TOKEN;

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
// Model selection is code-level, not infra-level. Change these typed arrays in
// code when you want to switch models. No env vars.
//
// Each chain is ordered: [primary, fallback1, fallback2, ...]. The primary is
// passed to `openrouter.chat(model)`. The rest are passed as
// `providerOptions.openrouter.models` so OpenRouter auto-failovers on errors.
// The `models` array must NOT include the primary (per OpenRouter docs).
//
// Dev / staging / test all use the free chains. Only production uses the paid
// chains. This prevents burning credits during local iteration.
//
// https://openrouter.ai/docs/guides/routing/model-fallbacks

// Free models for non-production environments (dev, staging, test).
// Pre-eval and post-eval need models that support structured outputs
// (response_format or structured_outputs parameter).
const PRE_EVAL_DEV_CHAIN = [
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

const POST_EVAL_DEV_CHAIN = [
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

const INTERVIEW_DEV_CHAIN = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
] as const;

const JOB_CREATION_DEV_CHAIN = [
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

// Voice assessment runs on a real-time pipeline, so latency matters more than
// raw quality. Use the fastest free chat models as the primary chain.
const VOICE_DEV_CHAIN = [
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
] as const;

// Paid frontier models for production.
const PRE_EVAL_PROD_CHAIN = ["anthropic/claude-haiku-4.5", "anthropic/claude-sonnet-4.5"] as const;

const POST_EVAL_PROD_CHAIN = ["anthropic/claude-sonnet-4.5", "anthropic/claude-opus-4.5"] as const;

const INTERVIEW_PROD_CHAIN = ["anthropic/claude-haiku-4.5", "anthropic/claude-sonnet-4.5"] as const;

const JOB_CREATION_PROD_CHAIN = [
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-haiku-4.5",
] as const;

const VOICE_PROD_CHAIN = ["anthropic/claude-haiku-4.5", "anthropic/claude-sonnet-4.5"] as const;

type Task = "pre_eval" | "post_eval" | "interview" | "job_creation" | "voice";

const TASK_CHAIN_MAP: Record<Task, { dev: readonly string[]; prod: readonly string[] }> = {
  pre_eval: { dev: PRE_EVAL_DEV_CHAIN, prod: PRE_EVAL_PROD_CHAIN },
  post_eval: { dev: POST_EVAL_DEV_CHAIN, prod: POST_EVAL_PROD_CHAIN },
  interview: { dev: INTERVIEW_DEV_CHAIN, prod: INTERVIEW_PROD_CHAIN },
  job_creation: { dev: JOB_CREATION_DEV_CHAIN, prod: JOB_CREATION_PROD_CHAIN },
  voice: { dev: VOICE_DEV_CHAIN, prod: VOICE_PROD_CHAIN },
};

/**
 * Returns the model chain for a given AI task in the current environment.
 *
 * `model`  — primary model id (pass to `openrouter.chat(model)`).
 * `fallbacks` — ordered list of fallback models tried by OpenRouter when the
 *   primary errors (429, downtime, moderation refusal). Must NOT include the
 *   primary model.
 */
export function getModelChain(task: Task): { model: string; fallbacks: string[] } {
  const isProd = env.NODE_ENV === "production";
  const chain = TASK_CHAIN_MAP[task][isProd ? "prod" : "dev"];
  return { model: chain[0], fallbacks: chain.slice(1) };
}

/**
 * Backward-compatible alias for the interview agent.
 * Delegates to `getModelChain("interview")`.
 */
export function getInterviewModelChain(): { model: string; fallbacks: string[] } {
  return getModelChain("interview");
}
