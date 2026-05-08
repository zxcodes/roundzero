import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/public-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "Privacy Policy | RoundZero" }],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2
        className="font-serif text-[1.35rem] leading-[1.2] mb-4"
        style={{ color: "var(--ed-ink)", fontWeight: 400 }}
      >
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-[1.65]" style={{ color: "var(--ed-muted)" }}>
        {children}
      </div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="editorial min-h-svh">
      <PublicHeader />
      <main id="main-content" className="pt-10 pb-20">
        <div className="mx-auto w-full max-w-3xl px-6 lg:px-8">
          <div className="mb-12">
            <span
              className="inline-block text-[10.5px] font-medium uppercase tracking-[0.22em]"
              style={{ color: "var(--ed-muted)" }}
            >
              Legal
            </span>
            <h1
              className="font-serif text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] mt-3"
              style={{ color: "var(--ed-ink)", fontWeight: 350 }}
            >
              Privacy Policy
            </h1>
            <p className="mt-4 text-[13px]" style={{ color: "var(--ed-muted)" }}>
              Last updated: May 8, 2026
            </p>
          </div>

          <div className="h-px w-full mb-12" style={{ background: "var(--ed-rule)" }} />

          <Section title="1. Introduction">
            <p>
              RoundZero ("we," "us," or "our") is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, store, and share your personal information when
              you use our hiring platform and AI interview services.
            </p>
            <p>
              By using RoundZero, you consent to the practices described in this Privacy Policy. If
              you do not agree with this policy, please do not use our Service.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>Account Information:</strong> When you sign
              up using Google OAuth, we collect your name, email address, and profile picture. We
              also store your selected role (candidate or company).
            </p>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>Candidate Profile Data:</strong> Candidates
              may provide headline, bio, skills, work history, external links, and upload a resume.
              This information is used to create your profile and is shared with companies when you
              apply to their job postings.
            </p>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>Company Profile Data:</strong> Companies
              may provide company name, description, industry, size, website, location, tech stack,
              culture information, and a logo. This data is displayed publicly on your company page
              and job listings.
            </p>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>Job Posting Data:</strong> When companies
              create job postings, we collect the job title, description, requirements, location,
              type, experience level, salary information, and custom interview questions.
            </p>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>Application Data:</strong> When you apply
              to a job, we create an application record that includes a snapshot of your profile and
              resume at the time of application, along with the application status and timeline.
            </p>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>Interview Data:</strong> During AI
              interviews, we collect the text of your conversation with our AI interviewer. This
              transcript is used to generate evaluation reports and is stored for quality and
              auditing purposes.
            </p>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>Usage Data:</strong> We automatically
              collect information about how you interact with the Service, including IP address,
              browser type, device information, pages visited, and timestamps. This helps us improve
              the Service and diagnose issues.
            </p>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>Cookies:</strong> We use cookies and
              similar technologies to authenticate users, remember preferences, and analyze usage
              patterns. You can control cookies through your browser settings.
            </p>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Facilitate job applications and candidate evaluation</li>
              <li>Conduct AI-powered interviews and generate evaluation reports</li>
              <li>Send transactional notifications about your applications and interviews</li>
              <li>Communicate with you about your account and the Service</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
          </Section>

          <Section title="4. How We Share Your Information">
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>With Companies:</strong> When you apply to
              a job, your profile information, resume, and AI interview report are shared with the
              company that posted the job. Application snapshots ensure companies see the exact
              information you submitted at the time of application.
            </p>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>With Service Providers:</strong> We use
              third-party services to operate the Service, including:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Google</strong> — for authentication (OAuth). See{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "var(--ed-accent)" }}
                >
                  Google's Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Cloudflare</strong> — for hosting, storage (R2), and AI infrastructure. See{" "}
                <a
                  href="https://www.cloudflare.com/privacypolicy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "var(--ed-accent)" }}
                >
                  Cloudflare's Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Resend</strong> — for transactional email delivery. See{" "}
                <a
                  href="https://resend.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "var(--ed-accent)" }}
                >
                  Resend's Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>OpenRouter</strong> — for AI model inference during interviews and
                evaluations. See{" "}
                <a
                  href="https://openrouter.ai/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "var(--ed-accent)" }}
                >
                  OpenRouter's Privacy Policy
                </a>
                .
              </li>
            </ul>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>For Legal Reasons:</strong> We may disclose
              your information if required by law, regulation, legal process, or governmental
              request.
            </p>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>Business Transfers:</strong> If RoundZero
              is involved in a merger, acquisition, or sale of assets, your information may be
              transferred as part of that transaction.
            </p>
            <p>We do not sell your personal information to third parties.</p>
          </Section>

          <Section title="5. Data Storage and Security">
            <p>
              Your data is stored on secure servers managed by Cloudflare and our database
              providers. We use industry-standard security measures including encryption in transit
              (TLS), access controls, and regular security audits.
            </p>
            <p>
              Resumes and company logos are stored in Cloudflare R2 with signed URL access for
              privacy. Interview transcripts and evaluation data are stored securely and access is
              restricted to authorized personnel and the company you applied to.
            </p>
            <p>
              While we take reasonable precautions, no system is completely secure. We cannot
              guarantee the absolute security of your data.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your personal information for as long as necessary to provide the Service
              and fulfill the purposes outlined in this Privacy Policy. Specifically:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Account and profile data are retained while your account is active. You may request
                deletion at any time.
              </li>
              <li>
                Application data and interview transcripts are retained for the duration of the
                hiring process and a reasonable period afterward to support disputes or audits.
              </li>
              <li>
                Usage and log data are retained for a shorter period, typically up to 12 months,
                unless longer retention is required for security or legal purposes.
              </li>
            </ul>
          </Section>

          <Section title="7. Your Rights">
            <p>
              Depending on your location, you may have certain rights regarding your personal
              information, including:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>The right to access the personal information we hold about you</li>
              <li>The right to correct inaccurate or incomplete information</li>
              <li>The right to delete your personal information</li>
              <li>The right to restrict or object to certain processing activities</li>
              <li>The right to data portability</li>
              <li>The right to withdraw consent where processing is based on consent</li>
            </ul>
            <p>
              To exercise these rights, please contact us at{" "}
              <a
                href="mailto:support@roundzero.dev"
                className="underline"
                style={{ color: "var(--ed-accent)" }}
              >
                support@roundzero.dev
              </a>
              . We will respond to your request within a reasonable timeframe.
            </p>
          </Section>

          <Section title="8. International Data Transfers">
            <p>
              RoundZero operates globally. Your information may be transferred to and processed in
              countries other than your own, including the United States. We ensure appropriate
              safeguards are in place to protect your information during such transfers.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              The Service is not intended for individuals under the age of 16. We do not knowingly
              collect personal information from children under 16. If we become aware that we have
              collected such information, we will take steps to delete it promptly.
            </p>
          </Section>

          <Section title="10. AI and Automated Decision-Making">
            <p>
              RoundZero uses artificial intelligence to conduct interviews and generate candidate
              evaluations. These systems analyze interview transcripts and profile data to produce
              structured reports with scores and recommendations.
            </p>
            <p>
              Our AI systems are designed to be explainable: every report includes specific
              reasoning linked to evidence in the conversation. However, these reports are assistive
              tools and should not be the sole basis for hiring decisions. Companies retain full
              discretion in their hiring choices.
            </p>
            <p>
              If you believe an AI evaluation contains a significant error, you may contact us to
              request a review.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. If we make material changes, we
              will notify you through the Service or by email. Your continued use of the Service
              after changes take effect constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices,
              please contact us at:{" "}
              <a
                href="mailto:support@roundzero.dev"
                className="underline"
                style={{ color: "var(--ed-accent)" }}
              >
                support@roundzero.dev
              </a>
            </p>
          </Section>

          <div className="h-px w-full mt-16 mb-8" style={{ background: "var(--ed-rule)" }} />
          <div className="flex items-center gap-4 text-[13px]" style={{ color: "var(--ed-muted)" }}>
            <Link to="/tos" className="underline hover:text-[var(--ed-ink)] transition-colors">
              Terms of Service
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
