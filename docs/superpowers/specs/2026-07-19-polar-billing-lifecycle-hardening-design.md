# Polar Billing Lifecycle Hardening Design

## Goal

Make RoundZero's existing Polar integration correct across checkout, payment recovery, cancellation, plan changes, resubscription, delayed or duplicated webhooks, and owner account deletion. Preserve the current user-facing subscription model while removing silent fallback and cross-tenant failure modes.

Cloudflare Queues are intentionally out of scope. Webhook state changes remain synchronous and small so Polar can retry database failures through its existing delivery mechanism.

## Subscription policy

- Paid entitlements require a recognized paid product and subscription status `active` or `trialing`.
- A subscription scheduled to cancel remains active until its paid period ends.
- `past_due`, `unpaid`, `incomplete`, `incomplete_expired`, and fully canceled subscriptions receive Free limits immediately. RoundZero does not apply an additional application-level grace period.
- Payment recovery uses the Polar customer portal. A recoverable subscription must not be offered a second checkout.
- An unknown Polar product is an integration error, never a Free subscription.

## Authoritative local state

Companies continue to store their current Polar customer, subscription, product, plan, status, period end, and cancellation flag. Add the subscription's Polar `modified_at` timestamp so webhook updates can reject older state.

Store any pending Polar plan change needed by the billing UI. The effective entitlement remains the current product until Polar applies the pending update and emits a new subscription update.

Add a webhook receipt table keyed by Polar's webhook ID. It records event type, event timestamp, processing status, and error details. Claiming an already completed event is a no-op; a previously failed event may be retried. This provides idempotency and an operational audit trail without introducing a queue.

## Webhook processing

The public endpoint will:

1. Read and validate the raw signed payload with Polar's SDK.
2. Claim the webhook ID in the receipt table.
3. Process the event synchronously.
4. Mark the receipt complete and return `200`.
5. On a processing failure, record the error and return `500` so Polar retries.

Handle `subscription.created`, `subscription.active`, `subscription.updated`, `subscription.past_due`, `subscription.canceled`, `subscription.uncanceled`, and `subscription.revoked`. Accept `checkout.updated` idempotently but leave subscription state to the authoritative subscription events, avoiding an extra Polar API request inside the webhook.

Subscription events resolve the company using the embedded customer's external ID first and the stored Polar customer ID second. A missing company or unknown product is a retryable integration failure rather than a successful no-op.

Updates apply only when their Polar `modified_at` value is not older than the stored subscription state. Revocation clears access only when the event's subscription ID matches the currently stored subscription. This prevents a delayed event for an old subscription from overwriting a later resubscription.

Welcome-email delivery remains non-critical. Subscription state commits first; email failure must not roll back access or make Polar retry an otherwise completed billing transition. Existing per-subscription deduplication remains in place.

## Checkout and portal

- Customer creation remains keyed by company ID. A concurrent create conflict recovers by looking up the Polar customer through its external ID.
- Checkout creation forwards Cloudflare's connecting IP to Polar and supplies billing-page success and return URLs.
- Checkout reconciliation verifies the checkout's `external_customer_id` matches the authenticated company before binding anything.
- Checkout and webhook reconciliation share one product-to-plan mapping that throws for unknown products.
- Existing active, trialing, past-due, unpaid, or cancellation-pending subscriptions use the customer portal instead of opening another checkout.
- Portal sessions return to RoundZero's billing page.
- The success page only announces activation when the reconciled subscription is actually active or trialing. Otherwise it reports that confirmation is pending or payment needs attention.

## Account deletion

When a company owner deletes their account and the company has a current Polar subscription, RoundZero first schedules cancellation at period end through Polar. If Polar cannot confirm the cancellation, account deletion fails and the session remains intact. This prevents future renewals while preserving the already-paid period and the existing 30-day account restoration window.

Restoring the account does not automatically uncancel billing. The owner can explicitly uncancel through the customer portal before the period ends.

## Billing UI

- Recovery states emphasize updating the payment method through the portal and do not show purchase actions that could create a second subscription.
- Scheduled cancellation copy explains that it can be reversed through Manage billing before the end date.
- A pending plan change is displayed with its effective date when Polar provides one.
- Current limits shown in billing use the same effective-plan policy as server-side entitlements.

## Verification

Add regression coverage for:

- Free limits for every non-entitled paid subscription status.
- Active scheduled cancellation retaining paid access.
- Duplicate webhook delivery.
- Older updates being ignored.
- Old-subscription revocation after a new resubscription.
- Missing customer recovery through external company ID.
- Unknown product failure and retry behavior.
- All explicit subscription event variants.
- Cross-company checkout rejection.
- Recoverable subscriptions being sent to the portal.
- Account deletion cancellation success and Polar failure.
- Pending plan changes and success-page messaging.
- Cloudflare connecting-IP forwarding and portal return URL.

Run focused billing, entitlement, account, and company tests, then the full `bun run check` and test suite. Validate the Worker bundle with Wrangler dry-run. A live sandbox checkout/webhook pass is optional when local sandbox credentials are available; automated tests must not depend on external Polar state.

## Operational checks outside the repository

Before production release, confirm the Polar dashboard has the correct production product IDs, portal plan changes enabled with the intended proration behavior, the webhook endpoint subscribed to the lifecycle events above, and an exact non-redirecting URL that Cloudflare security does not block.
