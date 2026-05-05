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

// Free OpenRouter models with native tool calling, used for local dev.
// Order matters — first is primary, the rest are fallbacks tried by OpenRouter
// when the primary is rate-limited / down. All models below are non-reasoning
// instruct models so they don't leak chain-of-thought into chat output.
// https://openrouter.ai/models?max_price=0&supported_parameters=tools
const DEV_MODEL_CHAIN = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
] as const;

// Frontier paid models for production. Claude Haiku as primary (fast + cheap),
// Sonnet as the rate-limit / outage fallback.
const PROD_MODEL_CHAIN = ["anthropic/claude-haiku-4.5", "anthropic/claude-sonnet-4.5"] as const;

/**
 * Returns the model chain the interview agent should use for THIS environment.
 * The first entry is the primary model id; pass the entire array as
 * `providerOptions.openrouter.models` so OpenRouter automatically falls back
 * through the list on 429s, provider outages, or moderation refusals.
 *
 * https://openrouter.ai/docs/guides/routing/model-fallbacks
 */
export function getInterviewModelChain(): { model: string; models: string[] } {
  const override = env.INTERVIEW_MODEL?.trim();
  if (override) {
    return { model: override, models: [override] };
  }

  const chain = env.NODE_ENV === "production" ? PROD_MODEL_CHAIN : DEV_MODEL_CHAIN;
  return { model: chain[0], models: [...chain] };
}
