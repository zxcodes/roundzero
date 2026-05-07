import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/shared/date";
import { PLAN_CONFIGS, SUBSCRIPTION_PLANS, type SubscriptionPlan } from "../config";
import {
  createBillingPortalSession,
  createCheckoutSession,
  type getMySubscription,
} from "../server/functions";

type Subscription = NonNullable<Awaited<ReturnType<typeof getMySubscription>>>;

export function BillingPage({ subscription }: { subscription: Subscription }) {
  const checkoutMutation = useMutation({
    mutationFn: async (plan: SubscriptionPlan) => {
      const result = await createCheckoutSession({ data: { plan } });
      return result.url;
    },
    onSuccess: (url) => {
      window.location.assign(url);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not start checkout");
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const result = await createBillingPortalSession({});
      return result.url;
    },
    onSuccess: (url) => {
      window.location.assign(url);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not open billing portal");
    },
  });

  const onCheckout = (plan: SubscriptionPlan) => {
    checkoutMutation.mutate(plan);
  };

  const onOpenPortal = () => {
    portalMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-6">
      <CurrentPlanCard
        subscription={subscription}
        onOpenPortal={onOpenPortal}
        portalLoading={portalMutation.isPending}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((id) => (
          <PlanCard
            key={id}
            plan={id}
            currentPlan={subscription.plan}
            onCheckout={onCheckout}
            checkingOut={checkoutMutation.isPending && checkoutMutation.variables === id}
          />
        ))}
      </div>
    </div>
  );
}

function CurrentPlanCard({
  subscription,
  onOpenPortal,
  portalLoading,
}: {
  subscription: Subscription;
  onOpenPortal: () => void;
  portalLoading: boolean;
}) {
  const config = PLAN_CONFIGS[subscription.plan];
  const periodEnd = subscription.currentPeriodEnd
    ? formatDate(subscription.currentPeriodEnd)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="flex items-center gap-2">
              {config.name}
              <Badge variant={subscription.isActive ? "default" : "secondary"}>
                {subscription.status}
              </Badge>
            </CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          {subscription.hasStripeCustomer ? (
            <Button variant="outline" onClick={onOpenPortal} disabled={portalLoading}>
              {portalLoading ? "Opening…" : "Manage billing"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      {periodEnd ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {subscription.cancelAtPeriodEnd
              ? `Cancels on ${periodEnd}.`
              : `Renews on ${periodEnd}.`}
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function PlanCard({
  plan,
  currentPlan,
  onCheckout,
  checkingOut,
}: {
  plan: SubscriptionPlan;
  currentPlan: SubscriptionPlan;
  onCheckout: (plan: SubscriptionPlan) => void;
  checkingOut: boolean;
}) {
  const config = PLAN_CONFIGS[plan];
  const isCurrent = plan === currentPlan;
  const isFree = plan === "free";
  const isEnterprise = plan === "enterprise";

  const onClick = () => {
    onCheckout(plan);
  };

  return (
    <Card data-current={isCurrent ? "true" : undefined} className="flex flex-col">
      <CardHeader>
        <CardTitle>{config.name}</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold">{config.priceLabel}</span>
          <span className="text-sm text-muted-foreground">/ {config.periodLabel}</span>
        </div>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-6">
        <ul className="flex flex-col gap-2 text-sm">
          {config.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <HugeiconsIcon
                icon={Tick02Icon}
                strokeWidth={2}
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {isCurrent ? (
          <Button variant="outline" disabled>
            Current plan
          </Button>
        ) : isFree ? (
          <Button variant="outline" disabled>
            Default plan
          </Button>
        ) : isEnterprise ? (
          <Button variant="outline" asChild>
            <a href="mailto:sales@roundzero.dev">Contact sales</a>
          </Button>
        ) : (
          <Button onClick={onClick} disabled={checkingOut}>
            {checkingOut ? "Redirecting…" : `Upgrade to ${config.name}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
