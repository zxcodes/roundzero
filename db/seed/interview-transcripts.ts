// @ts-nocheck
import { pick } from "./util";

type ChatMessage = { role: "assistant" | "candidate"; content: string };

type TranscriptInput = {
  candidateName: string;
  jobTitle: string;
  index: number;
};

function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

function roleFamily(jobTitle: string): "engineering" | "design" | "data" | "product" | "default" {
  const title = jobTitle.toLowerCase();
  if (title.includes("design")) return "design";
  if (title.includes("data")) return "data";
  if (title.includes("product manager") || title.includes("growth")) return "product";
  if (
    title.includes("engineer") ||
    title.includes("devops") ||
    title.includes("sre") ||
    title.includes("platform")
  ) {
    return "engineering";
  }
  return "default";
}

const companies = ["Meridian", "Kite Health", "Parcel", "Northline", "Cinder"] as const;
const teamSizes = ["four", "six", "eight", "eleven"] as const;

function companyFor(index: number) {
  return pick(companies, index);
}

function teamSizeFor(index: number) {
  return pick(teamSizes, index + 2);
}

// ─── Text interview scenarios ───────────────────────────────────────

function engineeringChatBilling(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);
  const co = companyFor(input.index);
  const team = teamSizeFor(input.index);

  return [
    {
      role: "assistant",
      content: `Hi ${name} — I'm Zero, and I'll be conducting your interview for the ${input.jobTitle} role today. We'll walk through your recent work, a couple of scenarios, and a few logistics questions at the end. This usually takes about 35 minutes. Are you ready to get started?`,
    },
    { role: "candidate", content: `Yeah, works for me. I'm in a quiet spot — go ahead.` },
    {
      role: "assistant",
      content: `Great. I'd like to start with something concrete from the last year — pick a project where you owned a meaningful chunk of work end-to-end. What was actually broken when you started, and what did you personally ship by the end?`,
    },
    {
      role: "candidate",
      content: `At ${co} our invoicing path still lived inside the monolith. Every month-end finance spent a full day reconciling duplicate line items in spreadsheets. I pitched splitting billing into its own service with an outbox pattern — my manager was skeptical because we'd tried a smaller refactor six months earlier and it stalled.`,
    },
    {
      role: "assistant",
      content: `That skepticism makes sense if a prior attempt stalled. What was different about how you scoped and sequenced this migration so it didn't end up in the same place?`,
    },
    {
      role: "candidate",
      content: `Scope control, honestly. First milestone was read-only shadowing — we wrote events alongside the old code for three weeks, compared totals nightly. Once variance dropped under half a percent, we flipped writes for new customers only. Legacy accounts stayed on the old path another month. I wrote the rollout doc and ran the war room channel during cutover.`,
    },
    {
      role: "assistant",
      content: `Shadowing before flipping writes is a disciplined approach. Did anything go wrong in production during cutover — even briefly — and if so, how did you handle it in the moment?`,
    },
    {
      role: "candidate",
      content: `One ugly night. A consumer double-processed refund events after we bumped Kafka retention without updating the idempotency TTL. Customers saw two credits on statements. I rolled the consumer back, replayed from a known-good offset, added a dedupe table keyed on provider event ID. Postmortem landed two fixes: retention checklist in deploy runbook, alerts on duplicate rate per partition.`,
    },
    {
      role: "assistant",
      content: `Helpful detail on the duplicate events. Stepping back from that incident — how big was the team on this work, and what was yours alone versus shared with others?`,
    },
    {
      role: "candidate",
      content: `${team} engineers plus a PM. I owned service design, migration sequencing, and on-call for billing ~six weeks post-launch. Another senior handled warehouse sync. I didn't write every line — maybe 40% of PRs — but I was accountable when finance pinged #incidents.`,
    },
    {
      role: "assistant",
      content: `Let me throw a design scenario at you. Imagine you're exposing a new REST endpoint that creates a subscription and calls an external billing provider. How would you keep that safe under retries, timeouts, and partial failures?`,
    },
    {
      role: "candidate",
      content: `Idempotency key on the request. Persist intent in Postgres before calling Stripe, status pending. External call in an outbox worker, not inline. If Stripe times out, worker retries with backoff; definitive failure marks failed and surfaces to user. We learned not to treat HTTP 500 as "definitely didn't happen."`,
    },
    {
      role: "assistant",
      content: `Makes sense. Shifting to collaboration — tell me about a time you and product disagreed on what should ship next. What was the disagreement, and how did you land on a decision?`,
    },
    {
      role: "candidate",
      content: `Product wanted self-serve plan upgrade before quarter end. I pushed to finish observability on billing first — nine hours reactive debugging that month. We compromised: two engineers on upgrade UI, one backend on dashboards. Upgrade shipped four days late but we caught a stuck-job bug before peak traffic.`,
    },
    {
      role: "assistant",
      content: `A few logistics questions to close out. What are your salary expectations for this role, and what's your earliest realistic start date given your current commitments?`,
    },
    {
      role: "candidate",
      content: pick(
        [
          `Base around $158k, flexible on equity. Two weeks notice — could start mid-month.`,
          `Looking $150–165k base. Need three weeks to hand off on-call cleanly.`,
          `Roughly $162k today; modest bump to move. Could start in two weeks.`,
        ],
        input.index,
      ),
    },
    {
      role: "assistant",
      content: `And are you legally authorized to work in the United States without employer sponsorship now or in the future?`,
    },
    { role: "candidate", content: `Yes, US citizen.` },
    {
      role: "assistant",
      content: `That's everything I needed on my end, ${name}. I appreciated how specific you were about the messy parts of the rollout — that's useful signal for the hiring team. They'll follow up on next steps.`,
    },
    { role: "candidate", content: `Thanks — happy to go deeper if the team wants a follow-up.` },
  ];
}

function engineeringChatFrontendPerf(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);
  const co = companyFor(input.index + 1);

  return [
    {
      role: "assistant",
      content: `Hi ${name}, I'm Zero — thanks for making time for the ${input.jobTitle} interview. I'll ask about work you've shipped, how you handle tradeoffs, and wrap with a few logistics. Ready when you are.`,
    },
    { role: "candidate", content: `Yep, ready when you are.` },
    {
      role: "assistant",
      content: `To start, I'd like to hear about a frontend performance problem you chased in production — not a theoretical optimization, but something users or the business actually felt. What was going wrong and how did you find the root cause?`,
    },
    {
      role: "candidate",
      content: `${co}'s dashboard LCP was 4.2s on mid-tier Android — sales demos were rough. Profiling showed a 480kb vendor chunk on first paint because someone re-exported the whole charting library from the root barrel.`,
    },
    {
      role: "assistant",
      content: `A barrel re-export causing that kind of regression is frustratingly common. How did you fix it without pausing feature work for a full rewrite — what shipped first and what moved the number?`,
    },
    {
      role: "candidate",
      content: `Lazy routes first — 3.1s. Deferred below-fold widgets with design. Real lift was dynamic chart import plus moving date formatting server-side. Five PRs over two weeks, measured each deploy in SpeedCurve.`,
    },
    {
      role: "assistant",
      content: `Good that you measured each deploy. Did you run into pushback from design or other engineers while changing load behavior — and if so, how did you work through it?`,
    },
    {
      role: "candidate",
      content: `Design worried skeleton states would feel janky. We prototyped two variants in Storybook, recorded side-by-side videos, product signed off progressive load. A junior was mid-feature on same layout — I paired so we didn't reintroduce the barrel import.`,
    },
    {
      role: "assistant",
      content: `On accessibility — where does that show up in your day-to-day workflow, not just as a checklist at the end? Give me a recent example where you caught or fixed something meaningful.`,
    },
    {
      role: "candidate",
      content: `axe in CI on changed routes. Fixed a filter drawer trapping focus on mobile last quarter — QA caught it, should've been me. I still fight div onClick in PRs.`,
    },
    {
      role: "assistant",
      content: `Here's a scenario product teams often raise: they want infinite scroll on a table with 10k rows and the client is already struggling. How would you respond — what would you propose instead and why?`,
    },
    {
      role: "candidate",
      content: `Ask what job scroll is doing — usually it's search. Pitch virtualized list with server cursor, cap 200 rendered rows. Full scan is async CSV, not DOM. Had that conversation twice; simpler pattern won both times.`,
    },
    {
      role: "assistant",
      content: `Last couple of logistics — what salary range are you targeting for your next role, and how much notice would you need to give your current employer?`,
    },
    {
      role: "candidate",
      content: pick(
        [`$135–150k base. Two weeks notice.`, `At $142k now; targeting $150k+ senior. Three weeks notice.`],
        input.index,
      ),
    },
    {
      role: "assistant",
      content: `Thanks ${name} — you gave good specifics on how you diagnosed and shipped the perf work. The team will be in touch about next steps.`,
    },
  ];
}

function engineeringChatOnCall(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);
  const co = companyFor(input.index + 3);

  return [
    {
      role: "assistant",
      content: `${name}, hi — I'm Zero. For this ${input.jobTitle} conversation I want to understand how you operate when production breaks, not just when features ship cleanly. We'll also touch on API design and a few logistics. Sound good?`,
    },
    { role: "candidate", content: `Yeah, that's most Tuesdays anyway.` },
    {
      role: "assistant",
      content: `Fair enough. Walk me through an incident you led — meaning you were the one coordinating response, not just joining someone else's bridge. What broke, and what did you do in the first thirty minutes?`,
    },
    {
      role: "candidate",
      content: `At ${co} API 5xx hit 18%, mostly checkout. Primary on-call — paged 2:14am, bridge by 2:20. Froze deploys, Postgres pool exhausted from analytics query on primary by mistake.`,
    },
    {
      role: "assistant",
      content: `Pool exhaustion from an analytics query on primary is a painful one. Once you identified that, what were the concrete remediation steps — and how long until customers stopped seeing errors?`,
    },
    {
      role: "candidate",
      content: `Killed rogue session, flipped analytics to replica via feature flag we'd never tested in prod — it worked. ~7 min to recover customer-visible errors. Drafted support updates every 15 min, no speculation. Postmortem next day: replica routing guard in CI, connection budget per service account.`,
    },
    {
      role: "assistant",
      content: `Solid comms discipline on the bridge. Looking back at that incident now, what would you do differently if you could run it again?`,
    },
    {
      role: "candidate",
      content: `Game day the replica failover — flag wasn't wired in one region. Dedicated scribe on bridge; I missed a DBA suggestion while typing notes.`,
    },
    {
      role: "assistant",
      content: `Different angle — when you're designing APIs that other internal teams depend on, what conventions or guardrails do you put in place so consumers aren't surprised by changes?`,
    },
    {
      role: "candidate",
      content: `URL version when behavior changes. Published error codes. Sunset headers plus #api-changes two weeks out. Small predictable REST over mega GraphQL for internal stuff — less surprise.`,
    },
    {
      role: "assistant",
      content: `Wrapping up — what are your compensation expectations for this role, and what notice period would you need before you could start?`,
    },
    {
      role: "candidate",
      content: `$155k floor; ideal $165–170k. Four weeks notice — tech lead on migration, could negotiate if timing's urgent.`,
    },
    {
      role: "assistant",
      content: `Appreciate the honesty on the replica flag — that kind of self-awareness is useful signal. We'll follow up soon, ${name}.`,
    },
  ];
}

function designChatResearch(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);
  const co = companyFor(input.index);

  return [
    {
      role: "assistant",
      content: `Hi ${name}, I'm Zero — I'll be interviewing you for the ${input.jobTitle} position today. I want to understand how you move from research through shipped UI, including how you handle disagreement and tradeoffs with PM and engineering. We can reference your portfolio if helpful.`,
    },
    { role: "candidate", content: `Ready — portfolio's open if you want a specific file.` },
    {
      role: "assistant",
      content: `Perfect. To start, pick a project where user research actually changed the direction of the work — not just validated a decision you'd already made. What were stakeholders assuming, and what did you learn that shifted the design?`,
    },
    {
      role: "candidate",
      content: `At ${co} we redesigned therapist scheduling. Stakeholders wanted a calendar grid. Six clinician interviews — four said grids lie about availability because buffers don't show. They wanted a timeline with explicit prep between sessions.`,
    },
    {
      role: "assistant",
      content: `That's a meaningful pivot — calendar grids are the default assumption in a lot of scheduling products. How did you bring PM and engineering along when the solution got more complex than what they'd originally scoped?`,
    },
    {
      role: "candidate",
      content: `Recorded clips — grid vs timeline, same tasks. PM watched clinicians struggle on grid; landed harder than slides. Eng pushed back on timeline complexity; v1 day view only. Figma redlines for overlap, cancelled ghosts, telehealth timezone.`,
    },
    {
      role: "assistant",
      content: `The video clips are a smart move for alignment. Once the timeline shipped, what did you measure in the first month to know whether the research bet actually worked?`,
    },
    {
      role: "candidate",
      content: `Timeline in 11 weeks. Booking errors down 34% month one. Scheduling support tickets ~40/week to low twenties.`,
    },
    {
      role: "assistant",
      content: `Those are tangible outcomes. Tell me about a moment where visual polish conflicted with timeline — maybe custom illustration work or animation scope — and how you decided what to cut or defer.`,
    },
    {
      role: "candidate",
      content: `Custom empty-state illustrations cost a sprint. Used system art plus copy — "No sessions Thursday," CTA to Friday. A/B on one screen, no conversion lift, shipped simple. Logged illustrations as fast follow.`,
    },
    {
      role: "assistant",
      content: `Makes sense to ship pragmatically and log the rest. When you're handing off to engineers, what does a good handoff look like for you — what do you include beyond the Figma file itself?`,
    },
    {
      role: "candidate",
      content: `Figma dev mode, props documented, Loom for drag nuance. I sit sprint planning on animation work. In Slack when they ask "buffer zero edge case."`,
    },
    {
      role: "assistant",
      content: `A couple of logistics to close — what salary range are you looking for in your next role, and how much notice would you need to give before starting?`,
    },
    { role: "candidate", content: `$125–140k depending on band. Two weeks notice.` },
    {
      role: "assistant",
      content: `Thanks ${name} — you gave clear examples of research changing direction and how you navigated tradeoffs with the team. That's helpful context for the hiring manager. We'll be in touch on next steps.`,
    },
  ];
}

function dataChatPipeline(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);
  const co = companyFor(input.index + 2);

  return [
    {
      role: "assistant",
      content: `Hey ${name}, I'm Zero — thanks for joining the ${input.jobTitle} interview. I'd like to hear how you build and operate data pipelines in production, especially when upstream data goes wrong. We'll also cover how you balance speed with correctness.`,
    },
    { role: "candidate", content: `Good — the going wrong part is where you learn.` },
    {
      role: "assistant",
      content: `Agreed. Describe a pipeline you owned where upstream schema or export format changed without warning. What broke downstream, and how long before someone noticed?`,
    },
    {
      role: "candidate",
      content: `Marketing analytics at ${co}: Segment → S3 → dbt → Looker. Vendor nested a field, flatten broke, campaign_id null rate hit 12%. Attribution model silent-failed — wrong CAC in CFO deck three days.`,
    },
    {
      role: "assistant",
      content: `Three days of wrong CAC in a CFO deck is a rough detection lag. Walk me through how you found the root cause and what you changed both to fix the data and prevent a repeat.`,
    },
    {
      role: "candidate",
      content: `Row count alerts but not null rate — my gap. Added dbt tests, blocked merges. Backfilled from raw JSON, subscribed vendor changelog. Said in standup I own fix and prevention — wasn't glamorous.`,
    },
    {
      role: "assistant",
      content: `Owning it publicly in standup matters for trust. How do you personally draw the line between shipping analytics fast and holding the bar on data correctness — especially when PM or finance is pushing for a deadline?`,
    },
    {
      role: "candidate",
      content: `Tier datasets. Finance metrics — hard gates, no Friday deploy. Experimental stuff — staging ok, label beta. Make PMs write the decision the metric supports.`,
    },
    {
      role: "assistant",
      content: `That's a sensible tiering model. What does your typical stack look like for transforms and orchestration, and how do you decide when a pipeline is "good enough" versus worth optimizing further?`,
    },
    {
      role: "candidate",
      content: `dbt transforms, Airflow orchestration, evaluating Dagster. BigQuery last job. SQL first, optimize when cost hurts.`,
    },
    {
      role: "assistant",
      content: `Last few logistics — what base salary range are you targeting, and what notice period would you need before you could start a new role?`,
    },
    {
      role: "candidate",
      content: `$155–175k base. Three weeks notice; could do KT async evenings.`,
    },
    {
      role: "assistant",
      content: `Appreciate the detail on the null-rate incident, ${name} — that's the kind of operational maturity we look for. The team will follow up with next steps.`,
    },
  ];
}

function productChatExperiment(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);
  const co = companyFor(input.index + 4);

  return [
    {
      role: "assistant",
      content: `Hi ${name}, I'm Zero. For this ${input.jobTitle} interview I want to hear how you run experiments in the real world — including ones that didn't work. We'll also talk about working with engineering under pressure and a few logistics at the end.`,
    },
    { role: "candidate", content: `I've got a failed one — probably more instructive.` },
    {
      role: "assistant",
      content: `Let's start there then. Tell me about an experiment you ran that didn't pan out — what hypothesis were you testing, what did the data actually show, and what did you learn?`,
    },
    {
      role: "candidate",
      content: `At ${co} we tested mandatory onboarding checklist — thought completion would lift activation. Moved it 8 points, p-hacked ourselves looking at day-3 only. Full cohort, flat at day 14. Root cause: checklist tasks were busywork, not path to first value.`,
    },
    {
      role: "assistant",
      content: `The day-3 vs day-14 gap is an important distinction. After you saw the full cohort result, what did you change in the product — and how did you bring engineering along on the new direction?`,
    },
    {
      role: "candidate",
      content: `Interviewed churned signups — pattern was "I don't know what to do first." Replaced checklist with single guided action tied to their stated goal at signup. Activation +11% held at 30 days. Slower to ship because eng wanted reusable widget framework; I pushed for one hardcoded path.`,
    },
    {
      role: "assistant",
      content: `Pushing for a hardcoded path when eng wants a framework is a familiar tension. When estimates on your roadmap work blow up, how do you typically work with engineering to still get a learning milestone shipped?`,
    },
    {
      role: "candidate",
      content: `Slice to learning milestone. For experiments I want power calc upfront — I'll cut scope before we fake significance. Had eng lead teach me SQL joins so I'm not filing blind tickets.`,
    },
    {
      role: "assistant",
      content: `Here's a stakeholder scenario: leadership wants a feature because a competitor just shipped it, but your data says it won't move your core metric. How do you handle that conversation?`,
    },
    {
      role: "candidate",
      content: `Ask what customer job competitor solves. Often it's parity anxiety. I'll pull support tags and churn reasons — half the time it's reliability not missing UI. Document "not now" with data so it doesn't resurface every quarter.`,
    },
    {
      role: "assistant",
      content: `To close out — what compensation range are you looking for, and what's your earliest realistic start date?`,
    },
    {
      role: "candidate",
      content: `$140–155k base. Two weeks notice.`,
    },
    {
      role: "assistant",
      content: `Thanks ${name} — leading with a failed experiment and what you changed afterward is useful signal. We'll be in touch about next steps.`,
    },
  ];
}

function defaultChatGeneral(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);
  const co = companyFor(input.index);

  return [
    {
      role: "assistant",
      content: `Hi ${name}, I'm Zero. Today we'll talk through your fit for the ${input.jobTitle} role — recent work, how you handle feedback and tradeoffs, and a few logistics questions toward the end.`,
    },
    { role: "candidate", content: `Sounds good.` },
    {
      role: "assistant",
      content: `To start, what drew you to this role specifically — not just RoundZero as a company, but this particular opening and the work it entails?`,
    },
    {
      role: "candidate",
      content: `Honestly the problem space — hiring workflows are messy for both sides. At ${co} I saw recruiters drowning in unstructured notes while candidates ghosted because feedback loops were slow. RoundZero's angle on structured eval before human rounds maps to what I think should exist.`,
    },
    {
      role: "assistant",
      content: `That's helpful context on why the problem resonates. What's a piece of recent work you're proud of — something where you can point to a concrete outcome, not just activity?`,
    },
    {
      role: "candidate",
      content: `Led cross-functional launch of internal referral portal — not glamorous. Cut time-to-first-screen from nine days to four by wiring CRM events into a single reviewer queue. I wrote the PRD, paired with eng on edge cases, trained recruiters live on two sessions.`,
    },
    {
      role: "assistant",
      content: `Nine days to four is a meaningful shift for recruiters. Tell me about the hardest piece of feedback you've received from a manager or peer — what was it, and what did you change afterward?`,
    },
    {
      role: "candidate",
      content: `Manager said I over-document and slow decisions. Fair — I now timebox specs to two pages and explicit open questions. Still document, but decision log instead of novel.`,
    },
    {
      role: "assistant",
      content: `Last couple of questions — what salary range are you targeting, and how much notice would you need before starting a new role?`,
    },
    {
      role: "candidate",
      content: pick(
        [`$130–145k. Two weeks.`, `$138k today, looking $145k+. Three weeks notice.`],
        input.index,
      ),
    },
    {
      role: "assistant",
      content: `Good talking with you, ${name}. The team will follow up on next steps.`,
    },
  ];
}

const engineeringChats = [engineeringChatBilling, engineeringChatFrontendPerf, engineeringChatOnCall];
const designChats = [designChatResearch];
const dataChats = [dataChatPipeline];
const productChats = [productChatExperiment];
const defaultChats = [defaultChatGeneral, engineeringChatBilling];

// ─── Voice assessment scenarios (spoken register) ───────────────────

function voiceEngineeringStakeholder(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);
  const co = companyFor(input.index);

  return [
    {
      role: "assistant",
      content: `This is the voice portion of your ${input.jobTitle} interview. Imagine you're on a Zoom with a non-technical VP who asks why a customer-facing launch slipped by two weeks. In your own words, how would you explain that in under a minute?`,
    },
    {
      role: "candidate",
      content: `I'd start with what customers would've risked if we shipped on the original date — in my last role at ${co} that was duplicate charges on renewals. Then I'd say we found it in staging, not prod, and the slip bought us idempotency fixes plus an extra game day. Close with new date and what we're watching to make sure we don't slip again.`,
    },
    {
      role: "assistant",
      content: `That's a reasonable framing. Now they push back and say something like "Can't we just patch it after launch?" — how do you respond without sounding like you're blocking the business?`,
    },
    {
      role: "candidate",
      content: `Yeah, that's common. I'd acknowledge the business pressure, then separate patch-later for cosmetic stuff from money-moving paths. If they still want to ship, I'd ask for explicit sign-off on the risk and make sure support has a script — I'm not passive-aggressive about it, but I want the tradeoff on record.`,
    },
    {
      role: "assistant",
      content: `Good. One more thing — when they ask for more technical detail than the VP needs, how do you keep the conversation concise without being dismissive?`,
    },
    {
      role: "candidate",
      content: `One layer down — "we had two workers that could process the same event" — then pause and ask if they want implementation or customer comms next. Usually they want customer comms.`,
    },
    {
      role: "assistant",
      content: `Last question on tone — if you're personally frustrated about the delay too, how do you make sure that doesn't leak into how you sound on the call?`,
    },
    {
      role: "candidate",
      content: `I try not to vent upward. If I'm frustrated, it's usually with process gaps on our side — I'll say "we should've caught this in checklist X" instead of blaming individuals. VP doesn't need my standup drama.`,
    },
    {
      role: "assistant",
      content: `That's what I needed, ${name}. Thanks for walking through that scenario — the voice section is complete.`,
    },
  ];
}

function voiceDesignCritique(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);

  return [
    {
      role: "assistant",
      content: `Welcome to the voice assessment for ${input.jobTitle}. I'd like you to talk through a real situation — tell me about a time you presented design work that received tough critique in a review. What was the feedback and how did you respond in the moment?`,
    },
    {
      role: "candidate",
      content: `Yeah — so I showed a onboarding flow, head of sales said it "felt enterprise" and would scare SMBs. I could've gotten defensive. Instead I asked for two accounts that churned at onboarding, pulled session replays, and realized he wasn't wrong about tone even if the flow logic held.`,
    },
    {
      role: "assistant",
      content: `Pulling churned accounts instead of arguing is a strong instinct. What did you actually change in the design after that, and how did you validate whether the revision addressed the concern?`,
    },
    {
      role: "candidate",
      content: `Lighter visual density, fewer form fields up front, progress copy that sounds human not legal. Kept the same IA — eng didn't have to rebuild. Sales lead got a preview channel, he brought it to a customer call unprompted which helped.`,
    },
    {
      role: "assistant",
      content: `When you're explaining design decisions to non-designers — say sales or a VP — how do you communicate rationale without leaning on jargon they won't follow?`,
    },
    {
      role: "candidate",
      content: `I anchor on user moment — "they just finished signup, they're tired" — show before/after thumbnail. Avoid saying "visual hierarchy" to sales; say "they see the next step first."`,
    },
    {
      role: "assistant",
      content: `Thanks ${name} — that gives me a clear picture of how you handle critique and communicate outward. We're done with the voice section.`,
    },
  ];
}

function voiceDataIncident(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);
  const co = companyFor(input.index + 1);

  return [
    {
      role: "assistant",
      content: `This is the voice check for ${input.jobTitle}. Imagine finance Slacks you at 4pm on a Thursday saying the numbers in the executive dashboard look wrong. Walk me through your first five minutes — what do you do before you reply?`,
    },
    {
      role: "candidate",
      content: `First — don't guess in the channel. I'd reply "looking, will update in 15" and pull freshness timestamps on the mart finance uses. At ${co} once it was just a stalled Airflow DAG, not bad data. If freshness is fine, spot-check raw vs transformed row counts for the metric in question.`,
    },
    {
      role: "assistant",
      content: `Good instinct not to speculate publicly. Let's say freshness looks fine but the transformed numbers are genuinely wrong — what's your next move for communication and coordination?`,
    },
    {
      role: "candidate",
      content: `Post in channel: impacted dashboards, not impacted systems of record, ETA for fix or rollback. Page eng if pipeline's broken, own comms if it's transform logic. Finance gets a one-pager after — they hate threads.`,
    },
    {
      role: "assistant",
      content: `If you're on a live call with finance while this is unresolved, how do you balance sounding calm with conveying urgency?`,
    },
    {
      role: "candidate",
      content: `Calm voice, urgent facts. "Revenue mart is wrong for March 3–5, bookings source is fine, don't use it for board prep yet." Panic makes execs make worse decisions.`,
    },
    {
      role: "assistant",
      content: `That's clear and actionable, ${name}. Thanks — that wraps the voice portion.`,
    },
  ];
}

function voiceProductNo(input: TranscriptInput): ChatMessage[] {
  const name = firstName(input.candidateName);

  return [
    {
      role: "assistant",
      content: `For this ${input.jobTitle} voice exercise, I want you to practice pushing back constructively. Imagine the CEO wants a feature shipped this week, but your data says it won't move retention. How do you handle that conversation?`,
    },
    {
      role: "candidate",
      content: `I'd bring the retention cohort chart and the request side by side — not to win an argument, to align on goal. Say something like: "If the goal is Q3 retention, this feature touches users who already stay; the drop-off is week-one setup. I recommend we swap priority unless there's a deal blocker I'm missing."`,
    },
    {
      role: "assistant",
      content: `Reasonable opening. Now the CEO says it's a deal blocker tied to one enterprise logo — the feature has to ship. How do you respond without just capitulating?`,
    },
    {
      role: "candidate",
      content: `Then I'd scope the smallest contract-compliant version, timebox it, and document opportunity cost on the retention work — in writing, friendly tone. One-logo features need sunset dates or they linger forever.`,
    },
    {
      role: "assistant",
      content: `How do you make sure you don't come across as stonewalling when you're saying no or pushing for a smaller scope?`,
    },
    {
      role: "candidate",
      content: `Offer two paths with dates. "Ship thin version Friday, retention project starts Monday" — they pick, I don't just say no.`,
    },
    {
      role: "assistant",
      content: `Thanks ${name} — offering concrete paths is the right move. Voice section is complete.`,
    },
  ];
}

const engineeringVoice = [voiceEngineeringStakeholder, voiceDataIncident, voiceProductNo];
const designVoice = [voiceDesignCritique, voiceEngineeringStakeholder];
const dataVoice = [voiceDataIncident, voiceEngineeringStakeholder];
const productVoice = [voiceProductNo, voiceEngineeringStakeholder];
const defaultVoice = [voiceEngineeringStakeholder, voiceDesignCritique];

function pickScenario<T>(scenarios: Array<(input: TranscriptInput) => T>, input: TranscriptInput) {
  return scenarios[input.index % scenarios.length]!(input);
}

export function buildInterviewChatMessages(input: TranscriptInput): ChatMessage[] {
  const family = roleFamily(input.jobTitle);
  switch (family) {
    case "design":
      return pickScenario(designChats, input);
    case "data":
      return pickScenario(dataChats, input);
    case "product":
      return pickScenario(productChats, input);
    case "engineering":
      return pickScenario(engineeringChats, input);
    default:
      return pickScenario(defaultChats, input);
  }
}

export function buildVoiceTranscriptMessages(input: TranscriptInput): ChatMessage[] {
  const family = roleFamily(input.jobTitle);
  switch (family) {
    case "design":
      return pickScenario(designVoice, input);
    case "data":
      return pickScenario(dataVoice, input);
    case "product":
      return pickScenario(productVoice, input);
    case "engineering":
      return pickScenario(engineeringVoice, input);
    default:
      return pickScenario(defaultVoice, input);
  }
}

export function buildCommunicationAnalysis(overallScore: number, input: TranscriptInput) {
  const base = clampScore(overallScore);
  const voice = buildVoiceTranscriptMessages(input);
  const candidateLines = voice.filter((m) => m.role === "candidate").map((m) => m.content);

  const quote = (index: number, maxLen = 120) => {
    const line = candidateLines[index % candidateLines.length] ?? candidateLines[0] ?? "";
    if (line.length <= maxLen) return line;
    return `${line.slice(0, maxLen - 3)}...`;
  };

  const dim = (delta: number, evidenceIndex: number) => ({
    score: clampScore(base + delta),
    evidence: [quote(evidenceIndex)],
  });

  const summaries = [
    `Conversational and grounded — explains tradeoffs without hiding uncertainty. Fits cross-functional audiences.`,
    `Direct under pressure — cites specifics, avoids buzzwords. Voice matches depth from the text interview.`,
    `Steady communicator; occasional filler but stays on thread. Good signal for stakeholder-facing work.`,
  ];

  return {
    clarity: dim(0.15, 0),
    articulation: dim(0.05, 1),
    conciseness: dim(-0.2, 2),
    listening: dim(0.25, 1),
    confidence: dim(0.1, 0),
    overallScore: base,
    summary: pick(summaries, input.index),
  };
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, value));
}