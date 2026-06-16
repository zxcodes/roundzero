import { Link } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/public-layout";

const CONTAINER = "mx-auto w-full max-w-3xl px-6 lg:px-10";

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
      <div className="space-y-4 text-[15px] leading-[1.65] text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalStrong({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-foreground">{children}</strong>;
}

export function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isMailto = href.startsWith("mailto:");
  return (
    <a
      href={href}
      target={isMailto ? undefined : "_blank"}
      rel={isMailto ? undefined : "noopener noreferrer"}
      className="text-brand underline underline-offset-2 hover:text-brand/80"
    >
      {children}
    </a>
  );
}

export function LegalPage({
  title,
  crossLink,
  children,
}: {
  title: string;
  crossLink: { to: "/privacy" | "/tos"; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <PublicHeader />
      <main id="main-content" className="pb-20 pt-10">
        <div className={CONTAINER}>
          <div className="mb-12">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Legal
            </span>
            <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              {title}
            </h1>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              Last updated: May 8, 2026
            </p>
          </div>

          <div className="mb-12 h-px w-full bg-border" />

          {children}

          <div className="mb-8 mt-16 h-px w-full bg-border" />
          <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
            <Link
              to={crossLink.to}
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {crossLink.label}
            </Link>
            <span>·</span>
            <span>&copy; {new Date().getFullYear()} RoundZero</span>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
