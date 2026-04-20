/**
 * Seeds realistic data for the currently authenticated user.
 *
 * - Company user  → company profile, 4 jobs (mix of statuses), 8 applicants with profiles
 * - Candidate user → candidate profile, 5 applications to existing seed jobs
 *
 * Run:
 *   bun run db:seed:me            — seeds both roles (if files exist)
 *   bun run db:seed:me company    — seeds company only
 *   bun run db:seed:me candidate  — seeds candidate only
 *
 * Requires: user.company.json / user.candidate.json (written automatically on dev signup)
 *           + base seed data (bun run db:seed) for candidate mode
 */

import { readFile } from "node:fs/promises";
import { closeSql, makeUuidFromSeed, pick, sql } from "./util";

type UserJson = {
  user: {
    id: string;
    email: string;
    name: string;
    picture: string | null;
    role: "company" | "candidate";
  };
};

async function loadUser(role: "company" | "candidate"): Promise<UserJson["user"] | null> {
  try {
    const raw = await readFile(`user.${role}.json`, "utf-8");
    const parsed = JSON.parse(raw) as UserJson;
    if (!parsed.user?.id || !parsed.user?.role) {
      return null;
    }
    return parsed.user;
  } catch {
    return null;
  }
}

// ─── Company seed ───────────────────────────────────────────────

async function seedForCompany(user: UserJson["user"]) {
  const companyId = makeUuidFromSeed(`seed-me-company-${user.id}`);
  const slug = user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  await sql`
    INSERT INTO companies (
      id, owner_id, name, slug, onboarding_completed_at, description, logo_key,
      industry, company_size, location, website, founded_year, tech_stack, culture, social_links
    )
    VALUES (
      ${companyId}, ${user.id}, ${`${user.name}'s Company`}, ${slug}, now(),
      ${"Innovative technology company at the forefront of AI-powered productivity tools. We're building intuitive platforms that help knowledge workers automate repetitive tasks, collaborate seamlessly, and focus on high-impact work. Our mission is to eliminate workplace friction through thoughtful design and cutting-edge AI."},
      ${`https://ui-avatars.com/api/?name=${encodeURIComponent(`${user.name}'s Company`)}&background=2563eb&color=ffffff&size=256&bold=true&format=svg`},
      ${"technology"}, ${"11-50"}, ${"San Francisco, CA"},
      ${`https://${slug}.com`}, ${2022},
      ${sql.json(["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker", "Kubernetes", "GraphQL", "Redis"])},
      ${"Mission-driven culture focused on innovation, psychological safety, and customer obsession. We ship frequently, learn rapidly, and maintain exceptionally high engineering standards while prioritizing work-life balance."},
      ${sql.json({ LinkedIn: `https://linkedin.com/company/${slug}`, Twitter: `https://twitter.com/${slug}`, Website: `https://${slug}.com`, Blog: `https://blog.${slug}.com` })}
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description,
        logo_key = EXCLUDED.logo_key, social_links = EXCLUDED.social_links,
        onboarding_completed_at = now(),
        updated_at = now()
  `;
  console.log(`  Company created: ${user.name}'s Company`);

  // Jobs - diverse mix of technical and non-technical roles
  const jobTemplates = [
    { 
      title: "Senior Full-Stack Engineer", 
      status: "open", 
      exp: "senior", 
      type: "full_time", 
      workplace: "remote" 
    },
    { 
      title: "Product Manager - Growth", 
      status: "open", 
      exp: "mid", 
      type: "full_time", 
      workplace: "hybrid" 
    },
    { 
      title: "Senior Backend Engineer", 
      status: "open", 
      exp: "senior", 
      type: "full_time", 
      workplace: "remote" 
    },
    { 
      title: "Frontend Engineer (React)", 
      status: "open", 
      exp: "mid", 
      type: "full_time", 
      workplace: "remote" 
    },
    { 
      title: "DevOps Engineer", 
      status: "draft", 
      exp: "senior", 
      type: "full_time", 
      workplace: "onsite" 
    },
    { 
      title: "Technical Writer", 
      status: "open", 
      exp: "mid", 
      type: "full_time", 
      workplace: "remote" 
    },
    { 
      title: "Customer Success Manager", 
      status: "open", 
      exp: "mid", 
      type: "full_time", 
      workplace: "hybrid" 
    },
    { 
      title: "UX/UI Designer", 
      status: "open", 
      exp: "mid", 
      type: "full_time", 
      workplace: "remote" 
    }
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
        description = "We're seeking a Senior Full-Stack Engineer to architect and develop our next-generation web application. You'll work with React, Node.js, and PostgreSQL to build scalable features that delight our users.";
        requirements = sql.json([
          "5+ years of full-stack development experience",
          "Expertise in React and Node.js",
          "Strong background in PostgreSQL and database design",
          "Experience with AWS and containerization (Docker/Kubernetes)",
          "Proven track record of shipping production-quality features"
        ]);
        interviewQuestions = sql.json([
          "Walk me through your architecture for a real-time collaborative application",
          "How do you approach performance optimization in web applications?",
          "Describe a challenging technical problem you solved and your approach",
          "How do you balance technical debt with feature development?"
        ]);
        break;
        
      case "Product Manager - Growth":
        description = "Join our product team to drive user acquisition, activation, and retention strategies. You'll work closely with engineering, design, and data teams to experiment and optimize our growth funnel.";
        requirements = sql.json([
          "3+ years of product management experience",
          "Proven track record driving growth metrics",
          "Strong analytical skills with experience in A/B testing and funnel analysis",
          "Experience with SQL and data visualization tools",
          "Excellent communication and stakeholder management skills"
        ]);
        interviewQuestions = sql.json([
          "How would you approach improving our user activation rate?",
          "Describe a growth experiment you ran and what you learned",
          "How do you prioritize between competing growth opportunities?",
          "What metrics do you consider most important for a SaaS product?"
        ]);
        break;
        
      case "Senior Backend Engineer":
        description = "We're looking for a Senior Backend Engineer to design and implement scalable APIs and microservices. You'll work with Node.js, PostgreSQL, and AWS to build robust backend systems.";
        requirements = sql.json([
          "5+ years of backend development experience",
          "Expertise in Node.js and API design",
          "Strong background in PostgreSQL and database optimization",
          "Experience with AWS services (Lambda, RDS, SQS, etc.)",
          "Knowledge of microservices architecture and event-driven systems"
        ]);
        interviewQuestions = sql.json([
          "How do you design APIs for scalability and maintainability?",
          "Describe your approach to database optimization and indexing",
          "How would you handle a sudden spike in traffic to our services?",
          "What's your experience with event-driven architectures?"
        ]);
        break;
        
      case "Frontend Engineer (React)":
        description = "As a Frontend Engineer, you'll implement beautiful, responsive user interfaces using React and TypeScript. You'll collaborate with design and product teams to bring our vision to life.";
        requirements = sql.json([
          "3+ years of professional React development experience",
          "Strong proficiency in TypeScript and modern JavaScript",
          "Experience with state management libraries (Redux, Zustand, or Context API)",
          "Background in CSS-in-JS or utility-first CSS frameworks",
          "Passion for creating pixel-perfect, accessible user interfaces"
        ]);
        interviewQuestions = sql.json([
          "How do you approach state management in complex React applications?",
          "Describe your process for ensuring UI accessibility",
          "How do you optimize React application performance?",
          "What's your experience with component libraries and design systems?"
        ]);
        break;
        
      case "DevOps Engineer":
        description = "We need a DevOps Engineer to maintain and improve our infrastructure, CI/CD pipelines, and monitoring systems. You'll ensure our services are reliable, scalable, and secure.";
        requirements = sql.json([
          "3+ years of DevOps or Site Reliability Engineering experience",
          "Strong background in AWS and infrastructure-as-code (Terraform or CloudFormation)",
          "Experience with CI/CD pipelines (GitHub Actions, GitLab CI, etc.)",
          "Knowledge of containerization (Docker) and orchestration (Kubernetes)",
          "Experience with monitoring and observability tools (Prometheus, Grafana, Datadog)"
        ]);
        interviewQuestions = sql.json([
          "How would you improve our current CI/CD pipeline?",
          "Describe your approach to infrastructure monitoring and alerting",
          "How do you handle incident response and postmortems?",
          "What's your experience with blue/green or canary deployments?"
        ]);
        break;
        
      case "Technical Writer":
        description = "Join our team as a Technical Writer to create clear, comprehensive documentation for our API and platform. You'll work closely with engineering to translate complex technical concepts into user-friendly guides.";
        requirements = sql.json([
          "2+ years of technical writing experience, preferably in software/SaaS",
          "Ability to understand and explain complex technical concepts",
          "Experience with documentation tools (Markdown, MDX, or similar)",
          "Basic understanding of APIs and web technologies",
          "Excellent written communication and editing skills"
        ]);
        interviewQuestions = sql.json([
          "How do you approach documenting complex technical concepts for different audiences?",
          "Describe your process for keeping documentation up-to-date with changing features",
          "How do you gather information from engineering teams effectively?",
          "What's your experience with API documentation specifically?"
        ]);
        break;
        
      case "Customer Success Manager":
        description = "As a Customer Success Manager, you'll be the primary advocate for our customers, ensuring they achieve their goals with our platform. You'll manage relationships, drive adoption, and identify expansion opportunities.";
        requirements = sql.json([
          "2+ years of customer success or account management experience",
          "Experience working with B2B SaaS customers",
          "Strong communication and relationship-building skills",
          "Ability to analyze usage data and identify trends",
          "Experience with CRM systems (Salesforce, HubSpot, etc.)"
        ]);
        interviewQuestions = sql.json([
          "How do you measure customer success and health?",
          "Describe a time you turned around an at-risk customer",
          "How do you balance supporting existing customers with identifying expansion opportunities?",
          "What's your experience with customer onboarding programs?"
        ]);
        break;
        
      case "UX/UI Designer":
        description = "We're looking for a UX/UI Designer to create intuitive, beautiful interfaces for our web application. You'll work closely with product and engineering to design user-centered experiences.";
        requirements = sql.json([
          "3+ years of UX/UI design experience",
          "Strong portfolio demonstrating user-centered design process",
          "Proficiency in design tools (Figma, Sketch, or Adobe XD)",
          "Experience with design systems and component libraries",
          "Understanding of accessibility principles (WCAG)"
        ]);
        interviewQuestions = sql.json([
          "Walk me through your design process for a new feature",
          "How do you incorporate user feedback into your designs?",
          "How do you balance aesthetics with usability and accessibility?",
          "What's your experience with design systems?"
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
          "Walk me through a system you designed from scratch.",
          "How do you approach debugging a production incident?",
          "Describe a time you had to make a significant technical tradeoff.",
        ]);
    }

    await sql`
      INSERT INTO jobs (
        id, company_id, title, description, requirements, status,
        interview_questions, location, workplace_type, employment_type,
        experience_level, salary_min, salary_max, salary_currency, team_size, headcount
      )
      VALUES (
        ${jobId}, ${companyId}, ${t.title},
        ${description},
        ${requirements},
        ${t.status},
        ${interviewQuestions},
        ${"San Francisco, CA"}, ${t.workplace}, ${t.type}, ${t.exp},
        ${100000 + (i * 15000)}, ${180000 + (i * 20000)}, ${"USD"}, ${6 + i}, ${2}
      )
      ON CONFLICT (id) DO UPDATE
      SET title = EXCLUDED.title, status = EXCLUDED.status, updated_at = now()
    `;
  }
  console.log(`  Jobs created: ${jobTemplates.length}`);
}

// ─── Candidate seed ─────────────────────────────────────────────

async function seedForCandidate(user: UserJson["user"]) {
  const result = await sql`
    INSERT INTO candidate_profiles (
      id, user_id, onboarding_completed_at, headline, resume_key, resume_updated_at,
      bio, skills, links
    )
    VALUES (
      ${makeUuidFromSeed(`seed-me-profile-${user.id}`)}, ${user.id}, now(),
      ${"Senior Full-Stack Engineer"},
      ${`resumes/${user.id}/resume.pdf`}, now(),
      ${"Results-driven full-stack engineer with 6+ years of experience building scalable web applications and leading engineering initiatives. Expertise in TypeScript, React, Node.js, and PostgreSQL with a passion for creating exceptional user experiences and robust backend systems."},
      ${sql.json(["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker", "Kubernetes", "GraphQL", "Redis", "TypeORM", "Jest", "Testing Library"])},
      ${sql.json({ 
        github: "https://github.com/zxcodes", 
        linkedin: "https://linkedin.com/in/zxcodes",
        portfolio: "https://zxcodes.dev",
        twitter: "https://twitter.com/zxcodes"
      })}
    )
    ON CONFLICT (user_id) DO UPDATE
    SET headline = EXCLUDED.headline, bio = EXCLUDED.bio, skills = EXCLUDED.skills, links = EXCLUDED.links,
        onboarding_completed_at = now(),
        updated_at = now()
    RETURNING id
  `;
   
  const actualProfileId = result[0]!.id;
  console.log("  Candidate profile created");

  // Enhanced work history with detailed descriptions
  const workEntries = [
    { 
      company: "Vercel", 
      title: "Senior Frontend Engineer", 
      start: "2022-03", 
      end: null, 
      current: true,
      description: "Led frontend architecture for Vercel's dashboard, improving load times by 40% and implementing reusable component library used across 50+ internal tools."
    },
    { 
      company: "Stripe", 
      title: "Software Engineer", 
      start: "2020-06", 
      end: "2022-02", 
      current: false,
      description: "Built payment processing features handling $2B+ in annual transaction volume. Mentored 3 junior engineers and improved test coverage from 65% to 90%."
    },
    { 
      company: "Shopify", 
      title: "Junior Developer", 
      start: "2018-08", 
      end: "2020-05", 
      current: false,
      description: "Developed merchant-facing features for Shopify admin panel. Contributed to Polaris design system and shipped 15+ features used by 100k+ merchants."
    },
    { 
      company: "Freelance", 
      title: "Independent Consultant", 
      start: "2017-06", 
      end: "2018-07", 
      current: false,
      description: "Provided web development services to startup clients, delivering MVPs and helping establish technical foundations for early-stage products."
    }
  ];

  await sql`DELETE FROM candidate_work_history WHERE candidate_profile_id = ${actualProfileId}`;

  for (let i = 0; i < workEntries.length; i++) {
    const entry = workEntries[i]!;
    await sql`
      INSERT INTO candidate_work_history (
        id, candidate_profile_id, company, title, start_month, end_month,
        currently_working_here, sort_order
      )
      VALUES (
        ${makeUuidFromSeed(`seed-me-work-${user.id}-${i}`)},
        ${actualProfileId}, ${entry.company}, ${entry.title}, ${entry.start}, ${entry.end},
        ${entry.current}, ${i}
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
        throw new Error(`user.${role}.json not found — sign up as ${role} in dev mode first.`);
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
    console.error("\nNo user files found. Sign up in dev mode first to generate user.company.json / user.candidate.json.");
    process.exit(1);
  }

  console.log("\nDone!");
} catch (error) {
  console.error("Seed failed:", error);
  process.exit(1);
} finally {
  await closeSql();
}
