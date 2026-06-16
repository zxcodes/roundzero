import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import type { WebhookCheckoutUpdatedPayload } from "@polar-sh/sdk/models/components/webhookcheckoutupdatedpayload.js";
import type { WebhookSubscriptionActivePayload } from "@polar-sh/sdk/models/components/webhooksubscriptionactivepayload.js";
import type { WebhookSubscriptionCanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncanceledpayload.js";
import type { WebhookSubscriptionRevokedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionrevokedpayload.js";
import type { WebhookSubscriptionUpdatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionupdatedpayload.js";

import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import {
  clearCompanySubscription,
  updateCompanySubscription,
} from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { appEnv } from "@/shared/env.app";
import type { SubscriptionPlan, SubscriptionStatus } from "./config";
import { getPolar } from "./services/polar";

function planFromProductId(productId: string | null | undefined): SubscriptionPlan {
  if (!productId) return "free";
  if (productId === appEnv.POLAR_PRODUCT_ID_STARTER) return "starter";
  if (productId === appEnv.POLAR_PRODUCT_ID_GROWTH) return "growth";
  if (productId === appEnv.POLAR_PRODUCT_ID_SCALE) return "scale";
  return "free";
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

type PolarWebhookEvent = ReturnType<typeof validateEvent>;

/**
 * Verify + dispatch a Polar webhook event. Returns a `Response` so the worker
 * entrypoint can hand it directly to Cloudflare.
 *
 * The route is `/api/polar/webhook`.
 */
export async function handlePolarWebhook(request: Request): Promise<Response> {
  const signature = request.headers.get("webhook-signature");
  if (!signature) {
    return new Response("Missing webhook-signature header", { status: 400 });
  }

  const payload = await request.text();
  const headerRecord = headersToRecord(request.headers);

  let event: PolarWebhookEvent;
  try {
    event = validateEvent(payload, headerRecord, appEnv.POLAR_WEBHOOK_SECRET);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      const message = err instanceof Error ? err.message : "Invalid signature";
      console.warn("[polar.webhook] signature verification failed", message);
      return new Response(`Webhook Error: ${message}`, { status: 400 });
    }
    throw err;
  }

  try {
    switch (event.type) {
      case "checkout.updated": {
        const checkoutEvent = event as WebhookCheckoutUpdatedPayload;
        const checkout = checkoutEvent.data;
        if (checkout.subscriptionId) {
          const polar = getPolar();
          const subscription = await polar.subscriptions.get({
            id: checkout.subscriptionId,
          });
          await syncSubscription(subscription);
        }
        break;
      }
      case "subscription.active":
      case "subscription.updated": {
        const subEvent = event as
          | WebhookSubscriptionActivePayload
          | WebhookSubscriptionUpdatedPayload;
        await syncSubscription(subEvent.data);
        break;
      }
      case "subscription.canceled":
      case "subscription.revoked": {
        const subEvent = event as
          | WebhookSubscriptionCanceledPayload
          | WebhookSubscriptionRevokedPayload;
        await clearCompanySubscription(getDb(), {
          polarCustomerId: subEvent.data.customerId,
        });
        break;
      }
      default:
        // Ignore everything else.
        break;
    }
  } catch (err) {
    console.error("[polar.webhook] handler error", event.type, err);
    // 500 so Polar retries.
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function syncSubscription(subscription: Subscription): Promise<void> {
  const productId = subscription.productId;

  await updateCompanySubscription(getDb(), {
    polarCustomerId: subscription.customerId,
    polarSubscriptionId: subscription.id,
    polarProductId: productId,
    subscriptionPlan: planFromProductId(productId),
    subscriptionStatus: subscription.status as SubscriptionStatus,
    subscriptionCurrentPeriodEnd: subscription.currentPeriodEnd,
    subscriptionCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  });
}
