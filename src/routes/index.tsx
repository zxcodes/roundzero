import { Brain, ChartBar, ChatCircleText, File, Ranking, ShieldCheck } from "@phosphor-icons/react";
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
            <Button size="sm" variant="outline">
              For companies
            </Button>
            <Button size="sm">Sign in</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-28 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <p className="text-primary text-sm font-medium uppercase tracking-widest">
            AI-powered hiring platform
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Skip resume screening.
            <br />
            Get pre-evaluated candidates.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Hirely replaces the first round of hiring with AI-driven, adaptive interviews that
            produce structured, explainable candidate reports — so you interview only the people
            worth your time.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="lg">Post a job</Button>
            <Button variant="outline" size="lg">
              Apply as candidate
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-border/40 border-t">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-center">
            From job post to ranked shortlist — no manual screening required.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard
              step={1}
              title="Post a job"
              description="Describe the role, skills, and what matters most to your team."
            />
            <StepCard
              step={2}
              title="Candidates apply"
              description="Candidates upload their resume and enter an async AI interview."
            />
            <StepCard
              step={3}
              title="AI evaluates"
              description="Adaptive interviews probe depth, validate claims, and score across dimensions."
            />
            <StepCard
              step={4}
              title="Review reports"
              description="Get ranked candidates with explainable scores, strengths, and evidence."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-border/40 border-t">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Depth over volume
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-center">
            Not another job board. A decision engine that tells you who to hire — and why.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<ChatCircleText weight="duotone" className="h-6 w-6" />}
              title="Adaptive AI interviews"
              description="Questions change based on responses. The system probes deeper where needed and challenges vague answers."
            />
            <FeatureCard
              icon={<File weight="duotone" className="h-6 w-6" />}
              title="Resume analysis"
              description="Automatically extract skills, experience, and inconsistencies before the interview even begins."
            />
            <FeatureCard
              icon={<Brain weight="duotone" className="h-6 w-6" />}
              title="Specialized evaluators"
              description="Dedicated agents assess technical depth, communication clarity, and experience ownership independently."
            />
            <FeatureCard
              icon={<ShieldCheck weight="duotone" className="h-6 w-6" />}
              title="Consistency checks"
              description="Detect contradictions between resume claims and interview responses. Every flag is explained."
            />
            <FeatureCard
              icon={<Ranking weight="duotone" className="h-6 w-6" />}
              title="Ranked candidates"
              description="Weighted scoring across technical, communication, and experience dimensions — delivered as a ranked shortlist."
            />
            <FeatureCard
              icon={<ChartBar weight="duotone" className="h-6 w-6" />}
              title="Explainable reports"
              description="Every candidate gets a detailed report with scores, strengths, weaknesses, key insights, and a hire recommendation."
            />
          </div>
        </div>
      </section>

      {/* For companies / candidates split */}
      <section className="border-border/40 border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 lg:grid-cols-2">
          <div className="bg-card border-border/40 rounded-lg border p-8">
            <p className="text-primary text-sm font-medium uppercase tracking-widest">
              For companies
            </p>
            <h3 className="mt-3 text-xl font-bold">Stop screening. Start deciding.</h3>
            <ul className="text-muted-foreground mt-4 space-y-2 text-sm leading-relaxed">
              <li>Post jobs and receive ranked, pre-evaluated candidates</li>
              <li>Review detailed reports with scores and evidence</li>
              <li>Understand exactly why each candidate is ranked</li>
              <li>Filter by score, skills, and experience depth</li>
            </ul>
            <Button className="mt-6">Post your first job</Button>
          </div>
          <div className="bg-card border-border/40 rounded-lg border p-8">
            <p className="text-primary text-sm font-medium uppercase tracking-widest">
              For candidates
            </p>
            <h3 className="mt-3 text-xl font-bold">
              Show what you can do, not just what you wrote.
            </h3>
            <ul className="text-muted-foreground mt-4 space-y-2 text-sm leading-relaxed">
              <li>Apply and complete an async AI interview on your own time</li>
              <li>Get evaluated on actual skills, not keyword matching</li>
              <li>Chat-based interview — no video, no scheduling hassle</li>
              <li>~20-40 minute structured conversation</li>
            </ul>
            <Button variant="outline" className="mt-6">
              Browse open roles
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-border/40 border-t">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Replace your first round with AI.
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md">
            Structured interviews. Explainable evaluations. Candidates you can trust.
          </p>
          <Button size="lg" className="mt-6">
            Get started
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

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold">
        {step}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
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
