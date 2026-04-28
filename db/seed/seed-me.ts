// @ts-nocheck
/**
 * Seeds realistic data for the currently authenticated user.
 *
 * - Company user  → company profile, 4 jobs (mix of statuses), 8 applicants with profiles
 * - Candidate user → candidate profile, 5 applications to existing seed jobs
 *
 * Run:
 *   bun run db:seed:me            — seeds both roles (if users exist in DB)
 *   bun run db:seed:me company    — seeds company only
 *   bun run db:seed:me candidate  — seeds candidate only
 *
 * Requires: A user with the given role must exist in the database.
 *           Sign up in dev mode first, then run this script.
 *           + base seed data (bun run db:seed) for candidate mode
 */

import { closeSql, makeUuidFromSeed, pick, sql } from "./util";

type DevUser = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  role: "company" | "candidate";
};

async function loadUser(role: "company" | "candidate"): Promise<DevUser | null> {
  const rows = await sql`
    SELECT id, email, name, picture, role
    FROM users
    WHERE role = ${role}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  const user = rows[0];
  if (!user) {
    return null;
  }
  return user as DevUser;
}

// ─── Company seed ───────────────────────────────────────────────

async function seedForCompany(user: DevUser) {
  const companyId = makeUuidFromSeed(`seed-me-company-${user.id}`);
  const slug = user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  await sql`
    INSERT INTO companies (
      id, owner_id, name, slug, onboarding_completed_at, description, logo_key,
      industry, company_size, location, website, founded_year, tech_stack, culture, social_links
    )
      VALUES (
      ${companyId}, ${user.id}, ${user.name}, ${slug}, now(),
      ${"Innovative technology company at the forefront of AI-powered productivity tools. We're building intuitive platforms that help knowledge workers automate repetitive tasks, collaborate seamlessly, and focus on high-impact work. Our mission is to eliminate workplace friction through thoughtful design and cutting-edge AI."},
      ${`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=ffffff&size=256&bold=true&format=svg`},
      ${"technology"}, ${"11-50"}, ${"San Francisco, CA"},
      ${`https://${slug}.com`}, ${2022},
      ${sql.json(["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker", "Kubernetes", "GraphQL", "Redis"])},
      ${"Mission-driven culture focused on innovation, psychological safety, and customer obsession. We ship frequently, learn rapidly, and maintain exceptionally high engineering standards while prioritizing work-life balance."},
      ${sql.json({ LinkedIn: `https://linkedin.com/company/${slug}`, Twitter: `https://twitter.com/${slug}`, Website: `https://${slug}.com`, Blog: `https://blog.${slug}.com` })}
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description,
        logo_key = EXCLUDED.logo_key, industry = EXCLUDED.industry,
        company_size = EXCLUDED.company_size, location = EXCLUDED.location,
        website = EXCLUDED.website, founded_year = EXCLUDED.founded_year,
        tech_stack = EXCLUDED.tech_stack, culture = EXCLUDED.culture,
        social_links = EXCLUDED.social_links,
        onboarding_completed_at = now(),
        updated_at = now()
  `;
  console.log(`  Company created: ${user.name}`);

  // Common pre-screening questions companies actually ask
  const commonScreeningQuestions = [
    "What are your salary expectations for this role (annual, in USD)?",
    "What is your current notice period and earliest possible start date?",
    "Are you legally authorized to work in the country where this role is based without visa sponsorship?",
    "If sponsorship is required, what is your current visa status and what type of sponsorship would you need?",
    "Are you open to relocating to San Francisco, CA for this role? If hybrid/onsite, are you comfortable being in office 3+ days per week?",
    "Why are you considering leaving your current role, and what are you looking for in your next opportunity?",
  ];

  // Jobs - diverse mix of technical and non-technical roles
  const jobTemplates = [
    {
      title: "Senior Full-Stack Engineer",
      status: "open",
      exp: "senior",
      type: "full_time",
      workplace: "remote",
    },
    {
      title: "Product Manager - Growth",
      status: "open",
      exp: "mid",
      type: "full_time",
      workplace: "hybrid",
    },
    {
      title: "Senior Backend Engineer",
      status: "open",
      exp: "senior",
      type: "full_time",
      workplace: "remote",
    },
    {
      title: "Frontend Engineer (React)",
      status: "open",
      exp: "mid",
      type: "full_time",
      workplace: "remote",
    },
    {
      title: "DevOps Engineer",
      status: "draft",
      exp: "senior",
      type: "full_time",
      workplace: "onsite",
    },
    {
      title: "Technical Writer",
      status: "open",
      exp: "mid",
      type: "full_time",
      workplace: "remote",
    },
    {
      title: "Customer Success Manager",
      status: "open",
      exp: "mid",
      type: "full_time",
      workplace: "hybrid",
    },
    {
      title: "UX/UI Designer",
      status: "open",
      exp: "mid",
      type: "full_time",
      workplace: "remote",
    },
  ];

  const jobIds: string[] = [];

  for (let i = 0; i < jobTemplates.length; i++) {
    const t = jobTemplates[i]!;
    const jobId = makeUuidFromSeed(`seed-me-job-${user.id}-${i}`);
    jobIds.push(jobId);

    // Customize description and requirements based on job type
    let description = "";
    let requirements = "";
    let interviewQuestions = [];

    switch (t.title) {
      case "Senior Full-Stack Engineer":
        description =
          "We're seeking a Senior Full-Stack Engineer to architect and develop our next-generation web application. You'll own end-to-end features across our React/TypeScript frontend and Node.js/PostgreSQL backend, partnering directly with product and design to ship customer-facing experiences used by tens of thousands of teams. You'll also help shape our engineering standards, mentor mid-level engineers, and contribute to our internal design system.";
        requirements = sql.json([
          "5+ years of full-stack development experience shipping production software",
          "Deep expertise in React, TypeScript, and Node.js",
          "Strong background in PostgreSQL schema design and query optimization",
          "Experience with AWS and containerization (Docker/Kubernetes)",
          "Track record of breaking down ambiguous problems into shippable iterations",
          "Bonus: experience with real-time systems (WebSockets, CRDTs) or AI/LLM integrations",
        ]);
        interviewQuestions = sql.json([
          ...commonScreeningQuestions,
          "Walk me through the architecture of a real-time, multi-user feature you designed end-to-end — what tradeoffs did you make on consistency vs. latency?",
          "How do you approach performance optimization in a React + Node.js stack? Give a concrete example where you measurably improved a metric.",
          "Describe a hard production bug you debugged across the full stack. How did you isolate it and what was the root cause?",
          "How do you balance shipping quickly against accumulating technical debt on a small team?",
        ]);
        break;

      case "Product Manager - Growth":
        description =
          "Join our product team to drive user acquisition, activation, and retention. You'll own our growth roadmap, design and run high-velocity experiments across onboarding, activation, and conversion, and partner closely with engineering, design, and data to compound learnings into durable wins. This role reports directly to the Head of Product.";
        requirements = sql.json([
          "3+ years of product management experience, ideally with a growth or PLG focus",
          "Proven track record driving measurable growth metrics (activation, retention, conversion)",
          "Strong analytical skills with hands-on A/B testing and funnel analysis experience",
          "Comfortable writing SQL and exploring data in tools like Amplitude, Mixpanel, or Looker",
          "Excellent written communication and cross-functional stakeholder management",
        ]);
        interviewQuestions = sql.json([
          ...commonScreeningQuestions,
          "Walk us through a growth experiment you ran end-to-end — the hypothesis, design, result, and what you'd do differently.",
          "How would you approach improving the activation rate of a B2B SaaS product in its first 30 days?",
          "How do you decide between optimizing an existing funnel step vs. introducing a new acquisition channel?",
          "Which 3 metrics would you build a weekly growth review around for a product like ours, and why?",
        ]);
        break;

      case "Senior Backend Engineer":
        description =
          "We're looking for a Senior Backend Engineer to design and implement scalable APIs and asynchronous systems that power our platform. You'll work with Node.js, PostgreSQL, Redis, and AWS to build robust services, own observability for the systems you ship, and partner with frontend and ML engineers to expose new capabilities to customers.";
        requirements = sql.json([
          "5+ years of backend development experience in production environments",
          "Expertise in Node.js, TypeScript, and modern API design (REST/GraphQL)",
          "Strong background in PostgreSQL — schema modeling, indexing, query plans",
          "Experience with AWS (Lambda, RDS, SQS, S3) and infrastructure as code",
          "Working knowledge of event-driven architectures and queue-based systems",
          "Bonus: experience operating systems at >1k RPS or handling sensitive data (PII, payments)",
        ]);
        interviewQuestions = sql.json([
          ...commonScreeningQuestions,
          "Design an API for a webhook delivery system that guarantees at-least-once delivery — what are the moving parts and failure modes?",
          "Describe how you'd diagnose a query that suddenly went from 50ms to 5s in production.",
          "How would you handle a 10x traffic spike to a critical endpoint on short notice?",
          "Talk about an event-driven system you've built. What broke first when it scaled, and how did you fix it?",
        ]);
        break;

      case "Frontend Engineer (React)":
        description =
          "As a Frontend Engineer, you'll implement beautiful, responsive, accessible interfaces using React, TypeScript, and Tailwind. You'll collaborate with design to translate Figma into pixel-perfect production UI, contribute to our component library, and own the quality bar for the customer-facing surfaces you ship.";
        requirements = sql.json([
          "3+ years of professional React development experience",
          "Strong proficiency in TypeScript and modern JavaScript",
          "Experience with state management (TanStack Query, Zustand, Redux, or similar)",
          "Comfort with utility-first CSS (Tailwind) or CSS-in-JS",
          "Strong eye for detail — pixel-perfect, accessible, performant interfaces",
          "Bonus: experience with React Server Components, Suspense, or animation libraries",
        ]);
        interviewQuestions = sql.json([
          ...commonScreeningQuestions,
          "How do you decide between local state, server state, and global state in a complex React app?",
          "Describe how you'd ensure a complex form (multi-step, async validation) is accessible to keyboard and screen reader users.",
          "Walk me through a real performance optimization you shipped on the frontend — how did you measure it?",
          "What's your experience contributing to or maintaining a design system?",
        ]);
        break;

      case "DevOps Engineer":
        description =
          "We need a DevOps Engineer to own and improve our infrastructure, CI/CD pipelines, and observability stack. You'll be the on-call leader for production reliability, drive cost efficiency on AWS, and partner with product engineering to make safe deploys the default. This is an onsite role at our San Francisco HQ.";
        requirements = sql.json([
          "3+ years of DevOps or Site Reliability Engineering experience",
          "Strong AWS experience plus infrastructure-as-code (Terraform preferred)",
          "Hands-on with CI/CD pipelines (GitHub Actions, CircleCI, or similar)",
          "Production experience with Docker and Kubernetes",
          "Familiarity with observability tools (Prometheus, Grafana, Datadog, or similar)",
          "Comfortable being part of an on-call rotation and writing postmortems",
        ]);
        interviewQuestions = sql.json([
          ...commonScreeningQuestions,
          "Walk me through how you'd take a CI pipeline from 25 minutes down to under 5 minutes.",
          "Describe an incident you led the response to. What was the timeline, blast radius, and what changed afterward?",
          "How do you decide what to alert on vs. what to merely dashboard?",
          "Compare blue/green and canary deployments — when would you pick each, and why?",
        ]);
        break;

      case "Technical Writer":
        description =
          "Join us as a Technical Writer to own our developer-facing and product documentation. You'll partner with engineering to translate complex APIs and platform concepts into clear, task-oriented guides, maintain API references, and define our docs information architecture as the product expands.";
        requirements = sql.json([
          "2+ years of technical writing experience, ideally in B2B SaaS or developer tools",
          "Ability to read code (TypeScript / JS) and explain it accurately to non-experts",
          "Experience with docs-as-code workflows (Markdown/MDX, Git, PR reviews)",
          "Working understanding of REST APIs, webhooks, and authentication concepts",
          "Strong editorial judgment and information architecture instincts",
        ]);
        interviewQuestions = sql.json([
          ...commonScreeningQuestions,
          "Walk us through how you'd document a brand-new API endpoint from scratch — what artifacts would you produce?",
          "How do you keep documentation in sync with a fast-moving codebase? What systems or rituals have worked for you?",
          "Describe how you'd extract information from a busy engineer who 'doesn't have time for docs'.",
          "Show us a piece of API documentation you're particularly proud of and explain the choices behind it.",
        ]);
        break;

      case "Customer Success Manager":
        description =
          "As a Customer Success Manager, you'll be the primary advocate for our mid-market customers, ensuring they realize value from our platform. You'll own onboarding, drive adoption, lead QBRs, surface expansion opportunities, and feed structured customer insight back into product and engineering.";
        requirements = sql.json([
          "2+ years of customer success or account management experience in B2B SaaS",
          "Experience managing a book of business and hitting retention/expansion targets",
          "Strong written and verbal communication — comfortable in front of execs",
          "Comfort analyzing product usage data to spot risks and opportunities",
          "Experience with CRMs and CS tools (Salesforce, HubSpot, Gainsight, or similar)",
        ]);
        interviewQuestions = sql.json([
          ...commonScreeningQuestions,
          "How do you define and measure customer health? What signals do you weight most heavily?",
          "Walk me through a time you turned around an at-risk customer. What did you actually do, week by week?",
          "How do you balance reactive support with proactive expansion conversations across a 30+ account book?",
          "Describe an onboarding program you built or improved. What changed in the customer outcomes afterward?",
        ]);
        break;

      case "UX/UI Designer":
        description =
          "We're looking for a UX/UI Designer to craft intuitive, delightful interfaces for our web application. You'll lead design end-to-end on assigned product areas — from research and wireframes through high-fidelity Figma — partner closely with PM and engineering, and contribute to the evolution of our design system.";
        requirements = sql.json([
          "3+ years of UX/UI design experience for web SaaS products",
          "Strong portfolio demonstrating end-to-end product design (problem → research → ship)",
          "Expert-level proficiency in Figma, including auto layout and component libraries",
          "Experience contributing to or owning a design system",
          "Solid understanding of accessibility principles (WCAG 2.1 AA)",
        ]);
        interviewQuestions = sql.json([
          ...commonScreeningQuestions,
          "Walk me through your design process on a recent feature, from problem framing to ship.",
          "How do you incorporate user research and feedback into your designs without it slowing you down?",
          "How do you balance aesthetic ambition against accessibility and engineering cost?",
          "Tell us about a time you pushed back on a PM or engineer on a design decision. How did it land?",
        ]);
        break;

      default:
        description = `We're looking for a ${t.title} to join our growing team. You'll work on core product infrastructure, collaborate closely with product and design, and help define engineering standards as we scale.`;
        requirements = sql.json([
          "3+ years of production software engineering experience",
          "Strong system design fundamentals",
          "Experience with TypeScript and PostgreSQL",
          "Excellent communication and ownership mindset",
        ]);
        interviewQuestions = sql.json([
          ...commonScreeningQuestions,
          "Walk me through a system you designed from scratch.",
          "How do you approach debugging a production incident?",
          "Describe a time you had to make a significant technical tradeoff.",
        ]);
    }

    await sql`
      INSERT INTO jobs (
        id, company_id, title, description, requirements, status,
        interview_questions, location, workplace_type, employment_type,
        experience_level, salary_min, salary_max, salary_currency, team_size, headcount,
        final_report_target, expires_at
      )
      VALUES (
        ${jobId}, ${companyId}, ${t.title},
        ${description},
        ${requirements},
        ${t.status},
        ${interviewQuestions},
        ${t.workplace === "remote" ? "Remote (US timezones)" : "San Francisco, CA"},
        ${t.workplace}, ${t.type}, ${t.exp},
        ${100000 + (i * 15000)}, ${180000 + (i * 20000)}, ${"USD"}, ${6 + i}, ${i % 3 === 0 ? 2 : 1},
        ${5}, ${sql`now() + interval '30 days'`}
      )
      ON CONFLICT (id) DO UPDATE
      SET title = EXCLUDED.title, description = EXCLUDED.description,
          requirements = EXCLUDED.requirements, status = EXCLUDED.status,
          interview_questions = EXCLUDED.interview_questions,
          location = EXCLUDED.location, workplace_type = EXCLUDED.workplace_type,
          employment_type = EXCLUDED.employment_type, experience_level = EXCLUDED.experience_level,
          salary_min = EXCLUDED.salary_min, salary_max = EXCLUDED.salary_max,
          salary_currency = EXCLUDED.salary_currency, team_size = EXCLUDED.team_size,
          headcount = EXCLUDED.headcount, final_report_target = EXCLUDED.final_report_target,
          expires_at = EXCLUDED.expires_at,
          updated_at = now()
    `;
  }
  console.log(`  Jobs created: ${jobTemplates.length}`);
}

// ─── Candidate seed ─────────────────────────────────────────────

async function seedForCandidate(user: DevUser) {
  const RESUME_KEY =
    "resumes/8e32773d-d9d8-4eb7-997f-d91a3c8d52d9/a2a64299-e9c3-4294-b929-9099b2d6757a--mohammed-farmaan.pdf";

  const result = await sql`
    INSERT INTO candidate_profiles (
      id, user_id, onboarding_completed_at, headline, resume_key, resume_updated_at,
      bio, skills, links
    )
    VALUES (
      ${makeUuidFromSeed(`seed-me-profile-${user.id}`)}, ${user.id}, now(),
      ${"Software Engineer · TypeScript · React · Node.js · Cloudflare Workers"},
      ${RESUME_KEY}, now(),
      ${"I've spent the last four years building products at startups, starting as a frontend engineer and evolving into a full-stack engineer comfortable across the entire stack. I ship with intention. Code quality, developer experience, and user experience all matter. I've built real-time chat systems, financial platforms, Web3 applications, and cleaned up massive codebases. Each project has made me a better engineer. I don't just work on features. I work on products that users love."},
      ${sql.json([
        "TypeScript",
        "Python",
        "Next.js",
        "React Router 7",
        "Astro",
        "Tauri",
        "Electron",
        "React",
        "React Native",
        "Node",
        "Bun",
        "Cloudflare Workers",
        "Hono",
        "Express",
        "PostgreSQL",
        "MySQL",
        "SQLite",
        "MongoDB",
        "Redis",
      ])},
      ${sql.json({
        github: "https://github.com/zxcodes",
        linkedin: "https://linkedin.com/in/farmaann",
        portfolio: "https://farmaan.dev/work",
        twitter: "https://x.com/zxcodes",
        website: "https://farmaan.dev/work",
      })}
    )
    ON CONFLICT (user_id) DO UPDATE
    SET headline = EXCLUDED.headline,
        resume_key = EXCLUDED.resume_key,
        resume_updated_at = now(),
        bio = EXCLUDED.bio,
        skills = EXCLUDED.skills,
        links = EXCLUDED.links,
        onboarding_completed_at = now(),
        updated_at = now()
    RETURNING id
  `;
   
  const actualProfileId = result[0]!.id;
  console.log("  Candidate profile created");

  // Detailed, achievement-oriented work history (most recent first)
  const workEntries = [
    {
      company: "Cashflowy - A financial AI Book Keeping Software",
      title: "Software Engineer",
      start: "2026-01",
      end: "2026-03",
      current: false,
      description: [
        "Fixed the frontend React codebase within the first two weeks of joining.",
        "Replaced all manual data fetching inside useEffect hooks with a fully OpenAPI-generated, type-safe React Query client using Hey API.",
        "Migrated from a broken ESLint setup to a fully functional Biome setup with stricter rules. The entire codebase now lints and formats under 2s.",
        "Fixed the broken typechecker and all the type errors in the app: 'tsc --noEmit' now returns zero type errors.",
        "Deleted over 4k unused LOC using Knip.",
      ].join("\n\n"),
    },
    {
      company: "Warez Corp (formerly Soulbound TV)",
      title: "Software Engineer",
      start: "2024-06",
      end: "2026-01",
      current: false,
      description: [
        "soulbound.tv — A live streaming platform for gamers that bridges Web2 and Web3 using React Router v7 Framework Mode (formerly Remix).",
        "Built the primary user-facing real-time chat for the platform that supports mentions, stickers, and message reactions using WebSockets paired with Cloudflare's Durable Objects for persistent storage.",
        "Added React Compiler to the app, which drastically improved performance by reducing the number of re-renders and eliminated the need for manual memoization.",
        "Took care of technical debt and deleted over 12k lines of code using Knip.",
        "mojihealth.com — A comprehensive, insurance-backed therapy marketplace platform built with fullstack Bun, React, Inngest, and Postgres.",
        "purps.tv — A Web3 perps live trading and competition platform built on Hyperliquid.",
      ].join("\n\n"),
    },
    {
      company: "Klynk",
      title: "Software Engineer",
      start: "2024-04",
      end: "2024-06",
      current: false,
      description: [
        "Worked on the primary React Native app that manages their smart appliances and fixed a significant number of bugs in a short period of time.",
        "Provided a detailed plan outlining why they should migrate from React Native CLI to Expo to improve the app's long-term performance, maintainability, and code quality.",
      ].join("\n\n"),
    },
    {
      company: "Honc - India's Car Owners' App",
      title: "Frontend Engineer",
      start: "2023-06",
      end: "2023-12",
      current: false,
      description: [
        "Mentored new interns while introducing the team to improved patterns and refining the frontend codebase for all mobile and web applications.",
        "Built an Instagram & LinkedIn-like comments section with features for mentioning users, replying to comments, and editing comments.",
        "Built a video caching solution to optimize video playback within the Honc App.",
      ].join("\n\n"),
    },
    {
      company: "Zelp Soft Pvt. Ltd.",
      title: "Frontend Engineer",
      start: "2021-10",
      end: "2023-02",
      current: false,
      description: [
        "Started my career here, focused on building UI with React and React Native.",
        "Designed modules, components, pages, worked with REST APIs, and implemented custom MapViews using Google Maps.",
      ].join("\n\n"),
    },
    {
      company: "Engineering Dropout",
      title: "Self-taught Software Engineer",
      start: "2017-01",
      end: "2021-10",
      current: false,
      description: [
        "Dropped out to pursue software engineering full-time. Everything I know, I learned by building things and shipping code.",
      ].join("\n\n"),
    },
  ];

  await sql`DELETE FROM candidate_work_history WHERE candidate_profile_id = ${actualProfileId}`;

  for (let i = 0; i < workEntries.length; i++) {
    const entry = workEntries[i]!;
    await sql`
      INSERT INTO candidate_work_history (
        id, candidate_profile_id, company, title, start_month, end_month,
        currently_working_here, description, sort_order
      )
      VALUES (
        ${makeUuidFromSeed(`seed-me-work-${user.id}-${i}`)},
        ${actualProfileId}, ${entry.company}, ${entry.title}, ${entry.start}, ${entry.end},
        ${entry.current}, ${entry.description}, ${i}
      )
    `;
  }
  console.log("  Work history created");
}

// ─── Main ───────────────────────────────────────────────────────

const roleArg = process.argv[2] as "company" | "candidate" | undefined;
const rolesToSeed: ("company" | "candidate")[] = roleArg ? [roleArg] : ["company", "candidate"];

try {
  let seeded = false;

  for (const role of rolesToSeed) {
    const user = await loadUser(role);
    if (!user) {
      if (roleArg) {
        throw new Error(`No ${role} user found in database — sign up as ${role} in dev mode first.`);
      }
      continue;
    }

    console.log(`\nSeeding data for ${user.name} (${role})...\n`);

    if (role === "company") {
      await seedForCompany(user);
    } else {
      await seedForCandidate(user);
    }

    seeded = true;
  }

  if (!seeded) {
    console.error("\nNo users found in database. Sign up in dev mode first.");
    process.exit(1);
  }

  console.log("\nDone!");
} catch (error) {
  console.error("Seed failed:", error);
  process.exit(1);
} finally {
  await closeSql();
}
