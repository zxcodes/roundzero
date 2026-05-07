import type Stripe from "stripe";
import {
  clearCompanySubscription,
  updateCompanySubscription,
} from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { appEnv } from "@/shared/env.app";
import type { SubscriptionPlan, SubscriptionStatus } from "./config";
import { getStripe, stripeCryptoProvider } from "./services/stripe";

function planFromPriceId(priceId: string | null | undefined): SubscriptionPlan {
  if (!priceId) return "free";
  if (priceId === appEnv.STRIPE_PRICE_ID_PRO) return "pro";
  return "free";
}

/**
 * Verify + dispatch a Stripe webhook event. Returns a `Response` so the worker
 * entrypoint can hand it directly to Cloudflare.
 *
 * The route is `/api/stripe/webhook`. Stripe-CLI will forward to it locally
 * via: `stripe listen --forward-to http://localhost:3000/api/stripe/webhook`.
 */
export async function handleStripeWebhook(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      appEnv.STRIPE_WEBHOOK_SECRET,
      undefined,
      stripeCryptoProvider,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.warn("[stripe.webhook] signature verification failed", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    await dispatchEvent(event);
  } catch (err) {
    console.error("[stripe.webhook] handler error", event.type, event.id, err);
    // 500 so Stripe retries.
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function dispatchEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // The subscription is created moments before this fires; pull it fresh
      // so we have the current price + period end.
      if (session.mode !== "subscription" || !session.subscription) return;
      const subId =
        typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(subId);
      await syncSubscription(subscription);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription);
      return;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      await clearCompanySubscription(getDb(), { stripeCustomerId: customerId });
      return;
    }
    default:
      // Ignore everything else.
      return;
  }
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const periodEnd = item?.current_period_end ?? null;

  await updateCompanySubscription(getDb(), {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    subscriptionPlan: planFromPriceId(priceId),
    subscriptionStatus: subscription.status as SubscriptionStatus,
    subscriptionCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}
