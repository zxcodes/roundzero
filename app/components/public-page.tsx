import { cn } from "@/lib/utils";

export const PUBLIC_CONTAINER = "mx-auto w-full max-w-7xl px-6 lg:px-10";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

type PublicPageHeroProps = {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  meta?: React.ReactNode;
};

export function PublicPageHero({ eyebrow, title, lead, meta }: PublicPageHeroProps) {
  return (
    <section className="border-b border-border/40 bg-background">
      <div className={cn(PUBLIC_CONTAINER, "py-14 lg:py-16")}>
        <div className="max-w-2xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 text-[clamp(2rem,3.2vw,3rem)] font-semibold leading-[1.06] tracking-[-0.035em]">
            {title}
          </h1>
          {lead ? (
            <p className="mt-4 text-[clamp(0.98rem,1.3vw,1.1rem)] leading-relaxed text-muted-foreground">
              {lead}
            </p>
          ) : null}
          {meta ? <div className="mt-4 text-sm text-muted-foreground">{meta}</div> : null}
        </div>
      </div>
    </section>
  );
}
