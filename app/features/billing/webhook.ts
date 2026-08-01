import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import * as Sentry from "@sentry/cloudflare";
import type { Sql } from "postgres";

import {
  getPolarWebhookReceipt,
  markPolarWebhookCompleted,
  markPolarWebhookFailed,
  markPolarWebhookProcessing,
} from "@/features/billing/queries/queries_sql";
import { getDb } from "@/shared/db";
import { asSqlTransaction } from "@/shared/db-transaction";
import { appEnv } from "@/shared/env.app";

import { trySendSubscriptionWelcomeEmail } from "./services/email";
import { reconcilePolarSubscription, revokePolarSubscription } from "./services/subscription-state";

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

type PolarWebhookEvent = ReturnType<typeof validateEvent>;

type WelcomeSend = {
  polarSubscriptionId: string;
  plan: import("./config").SubscriptionPlan;
} | null;

/** Verify and synchronously persist a Polar webhook so Polar can retry failures. */
export async function handlePolarWebhook(request: Request): Promise<Response> {
  const signature = request.headers.get("webhook-signature");
  if (!signature) {
    return new Response("Missing webhook-signature header", { status: 400 });
  }

  const payload = await request.text();
  let event: PolarWebhookEvent;
  try {
    event = validateEvent(payload, headersToRecord(request.headers), appEnv.POLAR_WEBHOOK_SECRET);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      const message = error instanceof Error ? error.message : "Invalid signature";
      console.warn("[polar.webhook] signature verification failed", message);
      return new Response(`Webhook Error: ${message}`, { status: 400 });
    }
    throw error;
  }

  const webhookId = request.headers.get("webhook-id");
  if (!webhookId) {
    return new Response("Missing webhook-id header", { status: 400 });
  }

  const db = getDb();
  let welcomeSend: WelcomeSend = null;
  try {
    const result = await db.begin(async (transaction) => {
      const tx = asSqlTransaction(transaction);
      await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [webhookId]);

      const existing = await getPolarWebhookReceipt(tx, { id: webhookId });
      if (existing?.status === "completed") {
        return { duplicate: true, welcomeSend: null };
      }

      await markPolarWebhookProcessing(tx, {
        id: webhookId,
        eventType: event.type,
        eventTimestamp: event.timestamp,
      });

      const nextWelcomeSend = await processPolarEvent(tx, event);
      await markPolarWebhookCompleted(tx, { id: webhookId });
      return { duplicate: false, welcomeSend: nextWelcomeSend };
    });
    welcomeSend = result.welcomeSend;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Sentry.captureException(error);
    console.error("[polar.webhook] handler error", event.type, error);
    await markPolarWebhookFailed(db, {
      id: webhookId,
      eventType: event.type,
      eventTimestamp: event.timestamp,
      lastError: message,
    }).catch((receiptError) => {
      console.error("[polar.webhook] failed to record delivery error", receiptError);
    });
    return new Response("Webhook handler failed", { status: 500 });
  }

  if (welcomeSend) {
    await trySendSubscriptionWelcomeEmail(db, welcomeSend).catch((error) => {
      console.error("[polar.webhook] failed to send welcome email", error);
    });
  }

  return Response.json({ received: true });
}

async function processPolarEvent(db: Sql, event: PolarWebhookEvent): Promise<WelcomeSend> {
  switch (event.type) {
    case "subscription.created":
    case "subscription.active":
    case "subscription.updated":
    case "subscription.past_due":
    case "subscription.canceled":
    case "subscription.uncanceled": {
      return await syncSubscription(db, event.data);
    }
    case "subscription.revoked": {
      await revokePolarSubscription(db, event.data);
      return null;
    }
    default:
      return null;
  }
}

async function syncSubscription(db: Sql, subscription: Subscription): Promise<WelcomeSend> {
  const result = await reconcilePolarSubscription(db, subscription);
  if (!result.applied) return null;
  if (subscription.status !== "active" && subscription.status !== "trialing") return null;
  return { polarSubscriptionId: subscription.id, plan: result.plan };
}
