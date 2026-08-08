import { ArrowRight01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCalendarDate } from "@/shared/date";

export type ContentBreadcrumb = { name: string; path: string };

export function MarketingContentPage({
  breadcrumbs,
  children,
}: {
  breadcrumbs: ContentBreadcrumb[];
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-page min-h-svh bg-background text-foreground">
      <a href="#main-content" className="marketing-skip-link">
        Skip to main content
      </a>
      <PublicHeader />
      <main id="main-content">
        <nav
          aria-label="Breadcrumb"
          className="border-b border-border/60 bg-white px-6 py-3 lg:px-12 xl:px-16"
        >
          <ol className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <li key={item.path} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                <a
                  href={item.path}
                  aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
                  className={cn(
                    "hover:text-foreground",
                    index === breadcrumbs.length - 1 ? "text-foreground" : "",
                  )}
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

export function ContentHero({
  eyebrow,
  title,
  lead,
  supporting,
  audience = "employer",
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead: string;
  supporting?: string;
  audience?: "employer" | "candidate";
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const defaultSecondaryHref = audience === "candidate" ? "/jobs" : "/pricing";
  const defaultSecondaryLabel = audience === "candidate" ? "Browse jobs" : "View pricing";

  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto w-full max-w-[90rem] px-6 py-16 lg:px-12 lg:py-24 xl:px-16">
        <div className="marketing-rise max-w-5xl">
          <span className="marketing-eyebrow">{eyebrow}</span>
          <h1 className="mt-5 max-w-5xl text-balance text-[clamp(2.75rem,6vw,6.5rem)] font-medium leading-[0.94] tracking-[-0.06em]">
            {title}
          </h1>
          <div className="mt-7 grid gap-6 lg:grid-cols-12 lg:items-end">
            <p className="max-w-2xl text-[clamp(1rem,1.45vw,1.2rem)] leading-8 text-muted-foreground lg:col-span-7">
              {lead}
            </p>
            <div className="flex flex-wrap items-center gap-4 lg:col-span-4 lg:col-start-9 lg:justify-end">
              <Button size="lg" className="h-11 rounded-full px-5" asChild>
                <Link to={audience === "candidate" ? "/candidate/login" : "/company/login"}>
                  {audience === "candidate" ? "Find open roles" : "Post a job"}
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
                </Link>
              </Button>
              <a
                href={secondaryHref ?? defaultSecondaryHref}
                className="text-sm text-foreground underline-offset-4 hover:underline"
              >
                {secondaryLabel ?? defaultSecondaryLabel}
              </a>
            </div>
          </div>
          {supporting ? (
            <p className="mt-8 max-w-2xl border-l border-black/20 pl-4 text-sm leading-6 text-muted-foreground">
              {supporting}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ContentSection({
  eyebrow,
  title,
  lead,
  children,
  muted = false,
  id,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children?: React.ReactNode;
  muted?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-20 border-b border-border", muted ? "bg-muted/30" : "bg-white")}
    >
      <div className="mx-auto w-full max-w-[90rem] px-6 py-16 lg:px-12 lg:py-24 xl:px-16">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            {eyebrow ? <span className="marketing-eyebrow">{eyebrow}</span> : null}
            <h2 className="mt-4 max-w-xl text-balance text-[clamp(2rem,3.8vw,4rem)] font-medium leading-[0.98] tracking-[-0.05em]">
              {title}
            </h2>
            {lead ? (
              <div className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">{lead}</div>
            ) : null}
          </div>
          {children ? <div className="lg:col-span-6 lg:col-start-7">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

export type ProcessStep = { label: string; title: string; body: string };

export function ProcessList({ steps }: { steps: ProcessStep[] }) {
  return (
    <ol className="border-t border-black/15">
      {steps.map((step) => (
        <li
          key={step.label}
          className="grid gap-3 border-b border-black/15 py-6 sm:grid-cols-[5rem_1fr]"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {step.label}
          </span>
          <div>
            <h3 className="text-lg font-medium tracking-[-0.02em]">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EvidenceList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 rounded-2xl border border-border/60 bg-white px-4 py-4 text-sm leading-6"
        >
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className="mt-1 size-4 shrink-0 text-[var(--marketing-success)]"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProductImage({
  src = "/marketing/report-product.png",
  alt,
}: {
  src?: string;
  alt: string;
}) {
  return (
    <div className="marketing-report-frame">
      <img src={src} alt={alt} width={2342} height={1568} loading="lazy" decoding="async" />
    </div>
  );
}

export type RelatedContentItem = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
};

export function RelatedContent({
  title = "Keep exploring",
  items,
}: {
  title?: string;
  items: RelatedContentItem[];
}) {
  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto w-full max-w-[90rem] px-6 py-16 lg:px-12 lg:py-20 xl:px-16">
        <h2 className="text-2xl font-medium tracking-[-0.035em]">{title}</h2>
        <div className="mt-8 grid border-t border-black/15 md:grid-cols-3">
          {items.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "group block border-b border-black/15 px-1 py-7 md:px-6",
                index > 0 ? "md:border-l" : "md:pl-0",
              )}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {item.eyebrow}
              </span>
              <h3 className="mt-3 text-xl font-medium tracking-[-0.03em] group-hover:underline group-hover:underline-offset-4">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium">
                Read more
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({
  title,
  body,
  audience = "employer",
}: {
  title: string;
  body: string;
  audience?: "employer" | "candidate";
}) {
  return (
    <section className="bg-[#17181c] text-white">
      <div className="mx-auto w-full max-w-[90rem] px-6 py-16 text-center lg:px-12 lg:py-24 xl:px-16">
        <h2 className="mx-auto max-w-4xl text-balance text-[clamp(2.5rem,5vw,5.5rem)] font-medium leading-[0.94] tracking-[-0.06em]">
          {title}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/65">{body}</p>
        <Button size="lg" variant="secondary" className="mt-8 h-11 rounded-full px-5" asChild>
          <Link to={audience === "candidate" ? "/jobs" : "/company/login"}>
            {audience === "candidate" ? "Explore jobs" : "Post a job"}
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export type ArticleTocItem = { id: string; label: string };

export function ArticleHero({
  eyebrow,
  title,
  description,
  datePublished,
  dateModified,
  readingTime,
}: {
  eyebrow: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  readingTime: string;
}) {
  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto w-full max-w-[90rem] px-6 py-14 lg:px-12 lg:py-20 xl:px-16">
        <span className="marketing-eyebrow">{eyebrow}</span>
        <h1 className="mt-5 max-w-5xl text-balance text-[clamp(2.6rem,5.5vw,5.75rem)] font-medium leading-[0.95] tracking-[-0.058em]">
          {title}
        </h1>
        <p className="mt-7 max-w-3xl text-[clamp(1rem,1.35vw,1.18rem)] leading-8 text-muted-foreground">
          {description}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Written and reviewed by{" "}
          <a href="/" rel="author" className="text-foreground underline underline-offset-4">
            the RoundZero product team
          </a>{" "}
          · Published <time dateTime={datePublished}>{formatCalendarDate(datePublished)}</time>
          {dateModified !== datePublished ? (
            <>
              {" "}
              · Updated <time dateTime={dateModified}>{formatCalendarDate(dateModified)}</time>
            </>
          ) : null}{" "}
          · {readingTime}
        </p>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground">
          Editorial note: RoundZero reviews this guide against the live product workflow and the
          cited sources. Employers remain responsible for lawful, job-related hiring decisions.
        </p>
      </div>
    </section>
  );
}

export function ArticleLayout({
  toc,
  children,
}: {
  toc: ArticleTocItem[];
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-6 py-12 lg:grid-cols-12 lg:px-12 lg:py-20 xl:px-16">
        <aside className="lg:col-span-3">
          <nav
            aria-label="On this page"
            className="sticky top-20 rounded-2xl border border-border/60 bg-muted/20 p-5"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              On this page
            </p>
            <ol className="mt-4 space-y-3">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-sm leading-5 text-muted-foreground hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <article className="min-w-0 space-y-14 lg:col-span-7 lg:col-start-5">{children}</article>
      </div>
    </section>
  );
}

export function ArticleSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-balance text-3xl font-medium tracking-[-0.04em] sm:text-4xl">{title}</h2>
      <div className="mt-5 space-y-5 text-[15px] leading-7 text-muted-foreground [&_h3]:pt-3 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:tracking-[-0.02em] [&_h3]:text-foreground [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-3 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-3">
        {children}
      </div>
    </section>
  );
}

export function ArticleCallout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="rounded-2xl border border-border/60 bg-muted/25 p-5 sm:p-6">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </aside>
  );
}

export type ArticleSource = {
  title: string;
  publisher: string;
  href: string;
};

export function ArticleSources({ sources }: { sources: ArticleSource[] }) {
  return (
    <ArticleSection id="sources" title="Sources and further reading">
      <ul>
        {sources.map((source) => (
          <li key={source.href}>
            <a className="text-foreground underline underline-offset-4" href={source.href}>
              {source.title}
            </a>{" "}
            <span>— {source.publisher}</span>
          </li>
        ))}
      </ul>
    </ArticleSection>
  );
}

export type FaqItem = { question: string; answer: string };

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="border-t border-black/15">
      {items.map((item) => (
        <article key={item.question} className="border-b border-black/15 py-6">
          <h3 className="text-lg font-medium tracking-[-0.02em]">{item.question}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.answer}</p>
        </article>
      ))}
    </div>
  );
}
