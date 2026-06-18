import { Briefcase01Icon, Loading03Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/shared/date";
import { PLAN_CONFIGS, SUBSCRIPTION_PLANS, type SubscriptionPlan } from "../config";
import {
  createBillingPortalSession,
  createCheckoutSession,
  type getMySubscription,
} from "../server/functions";

type Subscription = NonNullable<Awaited<ReturnType<typeof getMySubscription>>>;

type JobCounts = { openCount: number; totalCount: number } | null;

export function BillingPage({
  subscription,
  jobCounts,
}: {
  subscription: Subscription;
  jobCounts: JobCounts;
}) {
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
        jobCounts={jobCounts}
        onOpenPortal={onOpenPortal}
        portalLoading={portalMutation.isPending}
      />

      {subscription.isActive && !subscription.cancelAtPeriodEnd ? (
        <p className="text-sm text-muted-foreground">
          You are on a paid plan. Use "Manage billing" above to change or cancel your subscription.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUBSCRIPTION_PLANS.map((id) => (
          <PlanCard
            key={id}
            plan={id}
            currentPlan={subscription.plan}
            isPaid={subscription.isActive}
            onCheckout={onCheckout}
            checkingOut={checkoutMutation.isPending && checkoutMutation.variables === id}
          />
        ))}
      </div>
    </div>
  );
}

function SubscriptionStatusAlert({
  subscription,
  periodEnd,
}: {
  subscription: Subscription;
  periodEnd: string | null;
}) {
  if (subscription.status === "past_due") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription>
          We couldn't process your latest payment. Please update your payment method via "Manage
          billing" to keep your subscription active.
        </AlertDescription>
      </Alert>
    );
  }

  if (subscription.status === "unpaid") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Subscription unpaid</AlertTitle>
        <AlertDescription>
          Your subscription is unpaid. Update your payment method via "Manage billing" to restore
          access.
        </AlertDescription>
      </Alert>
    );
  }

  if (subscription.cancelAtPeriodEnd && periodEnd) {
    return (
      <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
        <AlertTitle>Subscription canceled</AlertTitle>
        <AlertDescription>
          Your subscription is canceled and will end on {periodEnd}. You can resubscribe after it
          expires.
        </AlertDescription>
      </Alert>
    );
  }

  if (periodEnd) {
    return (
      <p className="text-sm text-muted-foreground">
        {subscription.cancelAtPeriodEnd ? `Cancels on ${periodEnd}.` : `Renews on ${periodEnd}.`}
      </p>
    );
  }

  return null;
}

function CurrentPlanCard({
  subscription,
  jobCounts,
  onOpenPortal,
  portalLoading,
}: {
  subscription: Subscription;
  jobCounts: JobCounts;
  onOpenPortal: () => void;
  portalLoading: boolean;
}) {
  const config = PLAN_CONFIGS[subscription.plan];
  const periodEnd = subscription.currentPeriodEnd
    ? formatDate(subscription.currentPeriodEnd)
    : null;
  const isFree = subscription.plan === "free";
  const jobLimit = PLAN_CONFIGS[subscription.plan].includedJobs;
  const jobUsage = jobCounts?.openCount ?? 0;
  const atLimit = jobUsage >= jobLimit;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="flex items-center gap-2">
              {config.name}
              <Badge variant={subscription.isActive || isFree ? "default" : "secondary"}>
                {isFree ? "active" : subscription.status}
              </Badge>
            </CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          {subscription.hasPolarCustomer ? (
            <Button variant="outline" onClick={onOpenPortal} disabled={portalLoading}>
              {portalLoading ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                  Opening...
                </>
              ) : (
                "Manage billing"
              )}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SubscriptionStatusAlert subscription={subscription} periodEnd={periodEnd} />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-4" />
              Active jobs
            </span>
            <span className="font-medium">
              {jobUsage} of {jobLimit}
            </span>
          </div>
          <Progress value={(jobUsage / jobLimit) * 100} className="h-2" />
          {atLimit ? (
            <p className="text-xs text-destructive">
              You've reached your job limit. Upgrade to a larger plan to post more jobs.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">What's included</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {config.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <HugeiconsIcon
                  icon={Tick02Icon}
                  strokeWidth={2}
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCard({
  plan,
  currentPlan,
  isPaid,
  onCheckout,
  checkingOut,
}: {
  plan: SubscriptionPlan;
  currentPlan: SubscriptionPlan;
  isPaid: boolean;
  onCheckout: (plan: SubscriptionPlan) => void;
  checkingOut: boolean;
}) {
  const config = PLAN_CONFIGS[plan];
  const isCurrent = plan === currentPlan;
  const isFree = plan === "free";

  const onClick = () => {
    onCheckout(plan);
  };

  return (
    <Card
      data-current={isCurrent ? "true" : undefined}
      className={`flex flex-col ${isCurrent ? "border-primary/40 ring-1 ring-primary/10 shadow-sm" : ""}`}
    >
      <CardHeader>
        <CardTitle className={isCurrent ? "text-foreground" : ""}>{config.name}</CardTitle>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold">{config.priceLabel}</span>
          <span className="text-sm text-muted-foreground">/ {config.periodLabel}</span>
        </div>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-6">
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-start gap-2">
            <HugeiconsIcon
              icon={Tick02Icon}
              strokeWidth={2}
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            <span>
              {config.includedJobs} active jobs
              {config.overagePrice ? `, then ${config.overagePrice}` : null}
            </span>
          </li>
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
        ) : isPaid ? (
          <Button variant="outline" disabled>
            Manage billing to change
          </Button>
        ) : (
          <Button onClick={onClick} disabled={checkingOut} className="shadow-sm">
            {checkingOut ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
                Redirecting...
              </>
            ) : (
              `Upgrade to ${config.name}`
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
