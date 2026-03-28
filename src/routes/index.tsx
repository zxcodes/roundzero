import { Briefcase, MagnifyingGlass, Sparkle, Users } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      {/* Nav */}
      <header className="border-border/40 border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-lg font-semibold tracking-tight">Hirely</span>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Button size="sm">Sign in</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Hire smarter. <br />
            Get hired faster.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Hirely connects companies with top talent through AI-powered matching, streamlined
            interviews, and transparent hiring workflows.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="lg">Get started</Button>
            <Button variant="outline" size="lg">
              Learn more
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-border/40 border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<MagnifyingGlass weight="duotone" className="h-6 w-6" />}
            title="Smart matching"
            description="Our AI analyzes skills, experience, and culture fit to surface the best candidates for every role."
          />
          <FeatureCard
            icon={<Briefcase weight="duotone" className="h-6 w-6" />}
            title="Streamlined pipeline"
            description="Track candidates from application to offer with a clean, collaborative hiring board."
          />
          <FeatureCard
            icon={<Users weight="duotone" className="h-6 w-6" />}
            title="Team collaboration"
            description="Share scorecards, leave feedback, and make hiring decisions together in real time."
          />
          <FeatureCard
            icon={<Sparkle weight="duotone" className="h-6 w-6" />}
            title="AI-assisted screening"
            description="Automatically rank and shortlist applicants so your team focuses on the most promising candidates."
          />
          <FeatureCard
            icon={<MagnifyingGlass weight="duotone" className="h-6 w-6" />}
            title="Job board"
            description="Publish roles to your branded career page and distribute to major job boards in one click."
          />
          <FeatureCard
            icon={<Briefcase weight="duotone" className="h-6 w-6" />}
            title="Analytics"
            description="Understand your hiring funnel with real-time metrics on time-to-hire, source quality, and more."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="border-border/40 border-t">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to transform your hiring?
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md">
            Join companies that have cut their time-to-hire in half with Hirely.
          </p>
          <Button size="lg" className="mt-6">
            Start for free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border/40 border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm">
          <span>&copy; {new Date().getFullYear()} Hirely</span>
          <div className="flex gap-4">
            <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border-border/40 space-y-3 rounded-lg border p-6">
      <div className="text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
