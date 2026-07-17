import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { companyLoginLinkForPlan } from "@/features/auth/signup-search";
import { PLAN_CONFIGS, SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/features/billing/config";
import { cn } from "@/lib/utils";

type Tier = {
  plan: SubscriptionPlan;
  featured: boolean;
};

const tiers: Tier[] = SUBSCRIPTION_PLANS.map((plan) => ({
  plan,
  featured: plan === "growth",
}));

function TierCta({ plan, featured }: Tier) {
  const content = (
    <>
      {plan === "free" ? "Start free" : "Choose plan"}
      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
    </>
  );

  if (plan === "free") {
    return (
      <Button
        variant={featured ? "default" : "outline"}
        className="mt-7 w-full rounded-full"
        asChild
      >
        <Link to="/company/login">{content}</Link>
      </Button>
    );
  }

  return (
    <Button variant={featured ? "default" : "outline"} className="mt-7 w-full rounded-full" asChild>
      <Link {...companyLoginLinkForPlan(plan)}>{content}</Link>
    </Button>
  );
}

export function MarketingPricingSection({ className }: { className?: string }) {
  return (
    <section id="pricing" className={cn("scroll-mt-20 border-b border-border bg-white", className)}>
      <div className="mx-auto w-full max-w-[90rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-32 xl:px-16">
        <div className="grid items-end gap-7 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="marketing-eyebrow">Pricing</span>
            <h2 className="mt-5 max-w-3xl text-balance text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[0.98] tracking-[-0.055em]">
              Start with one role. Scale when hiring does.
            </h2>
          </div>
          <p className="max-w-md text-[1.02rem] leading-7 text-muted-foreground lg:col-span-4 lg:col-start-9 lg:pb-1">
            Every plan pre-screens applicants and includes evidence-backed reports. Upgrade for more
            active roles, reports, and teammates.
          </p>
        </div>

        <div className="mt-12 grid border-t border-black/12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {tiers.map((tier, index) => {
            const config = PLAN_CONFIGS[tier.plan];

            return (
              <article
                key={tier.plan}
                className={cn(
                  "relative flex min-h-[470px] flex-col border-b border-black/12 px-5 py-7 sm:px-6 lg:border-b-0",
                  index % 2 === 1 ? "sm:border-l" : "",
                  index > 1 ? "lg:border-l" : "",
                  index === 1 ? "lg:border-l" : "",
                  tier.featured ? "marketing-pricing-featured" : "bg-white",
                )}
              >
                <div className="min-h-5">
                  {tier.featured ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#2f7a4d]">
                      Recommended
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-4 text-xl font-medium tracking-[-0.03em]">{config.name}</h3>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-[clamp(2.4rem,3.5vw,3.6rem)] font-medium leading-none tracking-[-0.055em]">
                    {config.priceLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">{config.periodLabel}</span>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">
                  {config.description}
                </p>

                <ul className="mt-7 flex-1 border-t border-black/10 pt-5">
                  {config.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 py-1.5 text-[13px] leading-5">
                      <span className="mt-[0.48rem] size-1 shrink-0 rounded-full bg-current" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <TierCta {...tier} />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
