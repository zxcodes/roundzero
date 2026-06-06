import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/public-layout";

export const Route = createFileRoute("/tos")({
  head: () => ({
    meta: [
      { title: "Terms of Service | RoundZero" },
      {
        name: "description",
        content:
          "RoundZero Terms of Service — the terms governing your use of our AI-driven hiring platform and interview services.",
      },
    ],
    links: [{ rel: "canonical", href: `${import.meta.env.VITE_APP_URL}/tos` }],
  }),
  component: TermsPage,
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

function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="mt-4 text-[13px]" style={{ color: "var(--ed-muted)" }}>
              Last updated: May 8, 2026
            </p>
          </div>

          <div className="h-px w-full mb-12" style={{ background: "var(--ed-rule)" }} />

          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using RoundZero ("the Service"), you agree to be bound by these Terms
              of Service. If you do not agree to these terms, you may not access or use the Service.
              These terms apply to all visitors, users, and others who access or use the Service,
              including both companies posting jobs and candidates applying for positions.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              RoundZero is a hiring platform that enables companies to post job openings and
              candidates to apply for those positions. Our Service includes AI-driven asynchronous
              interviews, candidate evaluation, structured reporting, and application tracking. The
              Service is provided "as is" and "as available" without warranties of any kind.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <p>
              When you create an account with RoundZero, you must provide information that is
              accurate, complete, and current at all times. Failure to do so constitutes a breach of
              these Terms, which may result in immediate termination of your account.
            </p>
            <p>
              You are responsible for safeguarding the authentication credentials that you use to
              access the Service. You agree not to disclose your credentials to any third party. You
              must notify us immediately upon becoming aware of any breach of security or
              unauthorized use of your account.
            </p>
            <p>
              We support Google OAuth for authentication. By using this sign-in method, you agree to
              Google's Terms of Service and Privacy Policy in addition to ours.
            </p>
          </Section>

          <Section title="4. User Types and Responsibilities">
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>For Companies:</strong> You represent that
              you have the authority to post jobs on behalf of your organization. All job postings
              must be accurate, lawful, and not discriminatory. You are responsible for complying
              with all applicable employment laws and regulations in your jurisdiction.
            </p>
            <p>
              <strong style={{ color: "var(--ed-ink)" }}>For Candidates:</strong> You represent that
              all information in your profile, resume, and applications is truthful and accurate.
              You grant RoundZero the right to share your application materials with the companies
              to which you apply. You understand that your profile and resume may be evaluated by
              our AI systems as part of the application process.
            </p>
          </Section>

          <Section title="5. Content and Intellectual Property">
            <p>
              You retain ownership of any content you submit to the Service, including resumes, job
              descriptions, and profile information. By posting content, you grant RoundZero a
              non-exclusive, royalty-free license to use, modify, and display that content solely
              for the purpose of operating and improving the Service.
            </p>
            <p>
              The Service and its original content (excluding content provided by users), features,
              and functionality are and will remain the exclusive property of RoundZero. The Service
              is protected by copyright, trademark, and other laws.
            </p>
          </Section>

          <Section title="6. AI Interviews and Evaluations">
            <p>
              RoundZero uses artificial intelligence to conduct asynchronous interviews and evaluate
              candidates. By participating in an AI interview, you consent to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Having your responses analyzed by AI systems</li>
              <li>The generation of structured evaluation reports based on your interview</li>
              <li>The sharing of these reports with the company you applied to</li>
            </ul>
            <p>
              We strive for fairness and transparency in our AI evaluations. Reports include
              explainable reasoning for scores and recommendations. However, AI evaluations are
              assistive tools and should not replace human judgment in hiring decisions.
            </p>
          </Section>

          <Section title="7. Prohibited Activities">
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Post false, misleading, or fraudulent job listings or applications</li>
              <li>
                Discriminate against candidates or employees based on protected characteristics
              </li>
              <li>Harvest or collect user information without consent</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to bypass or circumvent any security measures</li>
              <li>Use automated systems to access the Service without authorization</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </Section>

          <Section title="8. Termination">
            <p>
              We may terminate or suspend your account immediately, without prior notice or
              liability, for any reason, including if you breach these Terms. Upon termination, your
              right to use the Service will cease immediately.
            </p>
            <p>
              You may terminate your account at any time by discontinuing use of the Service. If you
              wish to delete your account and associated data, please contact us at{" "}
              <a
                href="mailto:support@roundzero.dev"
                className="underline"
                style={{ color: "var(--ed-accent)" }}
              >
                support@roundzero.dev
              </a>
              .
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, RoundZero shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including loss of
              profits, data, or goodwill, arising out of or in connection with your use of the
              Service.
            </p>
            <p>
              Our total liability for any claim arising out of or relating to these Terms or the
              Service shall not exceed the amount you paid to RoundZero in the twelve (12) months
              preceding the claim, or $100 if you have not made any payments.
            </p>
          </Section>

          <Section title="10. Disclaimer">
            <p>
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties,
              express or implied, regarding the Service, including but not limited to warranties of
              merchantability, fitness for a particular purpose, or non-infringement. We do not
              guarantee that the Service will be uninterrupted, secure, or error-free.
            </p>
            <p>
              We do not guarantee employment outcomes. RoundZero is a platform that facilitates
              connections between companies and candidates; we are not an employment agency.
            </p>
          </Section>

          <Section title="11. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Delaware, United States, without regard to its conflict of law provisions.
              Any dispute arising from these Terms shall be resolved in the courts located in
              Delaware.
            </p>
          </Section>

          <Section title="12. Changes to Terms">
            <p>
              We reserve the right to modify these Terms at any time. If we make material changes,
              we will provide at least 30 days' notice before the new terms take effect. Your
              continued use of the Service after any changes constitutes acceptance of the revised
              Terms.
            </p>
          </Section>

          <Section title="13. Contact Us">
            <p>
              If you have any questions about these Terms, please contact us at:{" "}
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
            <Link to="/privacy" className="underline hover:text-[var(--ed-ink)] transition-colors">
              Privacy Policy
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
