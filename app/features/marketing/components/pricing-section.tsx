import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { companyLoginLinkForPlan } from "@/features/auth/signup-search";
import {
  PLAN_CONFIGS,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
  teamMemberFeatureLabel,
} from "@/features/billing/config";
import { cn } from "@/lib/utils";

const NOT_INCLUDED = "Not included";
const CONTAINER = "mx-auto w-full max-w-[90rem] px-6 lg:px-12 xl:px-16";
const SECTION_PAD = "py-20 lg:py-28";
const SECTION_TINT = "bg-muted/30";

type Tier = {
  plan: SubscriptionPlan;
  name: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  featured?: boolean;
};

const tiers: Tier[] = SUBSCRIPTION_PLANS.map((plan) => {
  const config = PLAN_CONFIGS[plan];

  return {
    plan,
    name: config.name,
    price: config.priceLabel,
    period: config.periodLabel,
    description: config.description,
    cta: plan === "free" ? "Start free" : "Get started",
    featured: plan === "growth",
  };
});

const featureRows = [
  {
    label: "Active job postings",
    values: SUBSCRIPTION_PLANS.map((plan) => String(PLAN_CONFIGS[plan].includedJobs)),
  },
  { label: "AI job creation", values: [NOT_INCLUDED, "Included", "Included", "Included"] },
  {
    label: "AI pre-evaluation",
    values: ["All applicants", "All applicants", "All applicants", "All applicants"],
  },
  {
    label: "Evaluation reports per job",
    values: SUBSCRIPTION_PLANS.map((plan) => String(PLAN_CONFIGS[plan].includedReportsPerJob)),
  },
  {
    label: "Teammates (+ you)",
    values: SUBSCRIPTION_PLANS.map((plan) =>
      teamMemberFeatureLabel(PLAN_CONFIGS[plan].includedTeamMembers),
    ),
  },
  { label: "Support", values: ["Email", "Email", "Email", "Email"] },
];

const costPlatforms = [
  {
    name: "LinkedIn Recruiter",
    cost: "$10,800+",
    per: "/ year",
    note: "Per-seat license, 150 InMails/mo",
  },
  {
    name: "Indeed Sponsored",
    cost: "~$150+",
    per: "/ mo",
    note: "Per-job daily budget, no fixed fee",
  },
  {
    name: "Greenhouse",
    cost: "$6,500+",
    per: "/ year",
    note: "ATS license, no evaluation included",
  },
  {
    name: "RoundZero Growth",
    cost: "$99",
    per: " / mo",
    note: `${PLAN_CONFIGS.growth.includedJobs} jobs, deep evaluations`,
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-[clamp(1.75rem,3.2vw,2.6rem)] font-semibold leading-[1.05] tracking-tight">
        {title}
      </h2>
      {lead ? (
        <p className="mt-4 text-[clamp(0.98rem,1.3vw,1.1rem)] leading-relaxed text-muted-foreground">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

function TierCta({ tier, className }: { tier: Tier; className?: string }) {
  const content = (
    <>
      {tier.cta}
      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
    </>
  );
  const classes = cn("w-full rounded-full", className);
  if (tier.plan === "free") {
    return (
      <Button variant={tier.featured ? "default" : "outline"} className={classes} asChild>
        <Link to="/company/login">{content}</Link>
      </Button>
    );
  }
  return (
    <Button variant={tier.featured ? "default" : "outline"} className={classes} asChild>
      <Link {...companyLoginLinkForPlan(tier.plan)}>{content}</Link>
    </Button>
  );
}

function CostComparison() {
  return (
    <div className="mt-16 border-t border-border pt-12">
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>Cost comparison</Eyebrow>
          <h3 className="mt-4 text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold leading-[1.1] tracking-[-0.02em]">
            Replace a $50,000 recruiting budget with a subscription.
          </h3>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Traditional platforms charge per job, per seat, or per placement, and still leave you
            with résumés to screen. RoundZero replaces the entire first round with a flat fee that
            includes evaluation.
          </p>
        </div>
        <div className="lg:col-span-7">
          <div className="spec-sheet">
            <div className="grid grid-cols-12 border-b border-border px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="col-span-5">Platform</span>
              <span className="col-span-3">Cost</span>
              <span className="col-span-4">Notes</span>
            </div>
            {costPlatforms.map((p) => (
              <div
                key={p.name}
                className="grid grid-cols-12 items-baseline border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/40"
              >
                <span className="col-span-5 text-[15px] font-medium">{p.name}</span>
                <span
                  className={cn(
                    "col-span-3 font-mono text-sm tabular-nums",
                    p.name === "RoundZero Growth" ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {p.cost}
                  <span className="text-[11px] text-muted-foreground"> {p.per}</span>
                </span>
                <span className="col-span-4 text-[12.5px] text-muted-foreground">{p.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingPricingSection({ className }: { className?: string }) {
  return (
    <section
      id="pricing"
      className={cn("scroll-mt-14 border-t border-border", SECTION_TINT, className)}
    >
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <SectionHeading
          eyebrow="Pricing"
          title="Pricing, plainly stated"
          lead="Replace a five-figure recruiting budget with a flat subscription that includes evaluation."
        />

        <div className="mt-12 hidden md:block">
          <table className="w-full border-collapse">
            <caption className="sr-only">
              Compare RoundZero pricing tiers for active jobs, AI features, reports, and support.
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="w-1/4 pb-6 text-left" />
                {tiers.map((t) => (
                  <th
                    key={t.name}
                    scope="col"
                    className={cn(
                      "w-1/4 px-4 pb-6 text-left align-top",
                      t.featured ? "border-x border-foreground/15 bg-muted/25" : "",
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <span className="eyebrow h-4">{t.featured ? "Most popular" : "\u00A0"}</span>
                      <span className="text-lg font-semibold tracking-[-0.01em]">{t.name}</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-3xl font-medium tracking-tight">
                          {t.price}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          / {t.period}
                        </span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-muted-foreground font-medium">
                        {t.description}
                      </p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row) => (
                <tr key={row.label} className="border-b border-border">
                  <th scope="row" className="py-4 pr-6 text-left align-top text-[15px] font-medium">
                    {row.label}
                  </th>
                  {row.values.map((value, valueIndex) => (
                    <td
                      key={`${row.label}-${tiers[valueIndex]?.name}`}
                      className={cn(
                        "px-4 py-4 align-top text-[14px]",
                        tiers[valueIndex]?.featured
                          ? "border-x border-foreground/15 bg-muted/25"
                          : "",
                        value === NOT_INCLUDED ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td />
                {tiers.map((t) => (
                  <td
                    key={t.name}
                    className={cn(
                      "px-4 pt-6 align-top",
                      t.featured ? "border-x border-foreground/15 bg-muted/25" : "",
                    )}
                  >
                    <TierCta tier={t} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 space-y-5 md:hidden">
          {tiers.map((t, tierIndex) => (
            <div
              key={t.name}
              className={cn(
                "rounded-3xl border p-5",
                t.featured
                  ? "border-x border-foreground/15 border-y-border bg-muted/25"
                  : "border-border",
              )}
            >
              <div className="mb-5 flex flex-col gap-1.5">
                {t.featured ? <span className="eyebrow text-foreground">Most popular</span> : null}
                <span className="text-lg font-semibold tracking-[-0.01em]">{t.name}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-medium tracking-tight">{t.price}</span>
                  <span className="font-mono text-xs text-muted-foreground">/ {t.period}</span>
                </div>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{t.description}</p>
              </div>
              <dl className="space-y-3">
                {featureRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 border-t border-border pt-2.5"
                  >
                    <dt className="text-[14px] font-medium">{row.label}</dt>
                    <dd
                      className={cn(
                        "shrink-0 text-right text-[13px]",
                        row.values[tierIndex] === NOT_INCLUDED
                          ? "text-muted-foreground"
                          : "text-foreground",
                      )}
                    >
                      {row.values[tierIndex]}
                    </dd>
                  </div>
                ))}
              </dl>
              <TierCta tier={t} className="mt-5" />
            </div>
          ))}
        </div>

        <CostComparison />
      </div>
    </section>
  );
}
