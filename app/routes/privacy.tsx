import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalLink, LegalPage, LegalSection, LegalStrong } from "@/components/legal-document";
import { buildPageHead } from "@/shared/seo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    buildPageHead({
      title: "Privacy Policy | RoundZero",
      description:
        "RoundZero Privacy Policy. How we collect, use, store, and share your personal information when you use our hiring platform and AI interview services.",
      path: "/privacy",
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" crossLink={{ to: "/tos", label: "Terms of Service" }}>
      <LegalSection title="1. Introduction">
        <p>
          RoundZero ("we," "us," or "our") is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, store, and share your personal information when you
          use our hiring platform and AI interview services.
        </p>
        <p>
          By using RoundZero, you consent to the practices described in this Privacy Policy. If you
          do not agree with this policy, please do not use our Service.
        </p>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <p>
          <LegalStrong>Account Information:</LegalStrong> When you sign up using Google OAuth, we
          collect your name, email address, and profile picture. We also store your selected role
          (candidate or company).
        </p>
        <p>
          <LegalStrong>Candidate Profile Data:</LegalStrong> Candidates may provide headline,
          skills, external links, and upload a resume. This information is used to create your
          profile and is shared with companies when you apply to their job postings.
        </p>
        <p>
          <LegalStrong>Company Profile Data:</LegalStrong> Companies may provide company name,
          description, industry, size, website, location, tech stack, culture information, and a
          logo. This data is displayed publicly on your company page and job listings.
        </p>
        <p>
          <LegalStrong>Job Posting Data:</LegalStrong> When companies create job postings, we
          collect the job title, description, location, type, experience level, salary information,
          and custom screening questions.
        </p>
        <p>
          <LegalStrong>Application Data:</LegalStrong> When you apply to a job, we create an
          application record that includes a snapshot of your profile and resume at the time of
          application, along with the application status and timeline.
        </p>
        <p>
          <LegalStrong>Interview Data:</LegalStrong> During AI text interviews, we collect your
          conversation transcript with our AI interviewer. If you complete the voice assessment, we
          process your voice audio live and store the resulting conversation transcript. The current
          voice assessment does not record or store a call-audio recording. The transcript is used
          to generate evaluation reports and for quality and auditing purposes.
        </p>
        <p>
          <LegalStrong>Usage Data:</LegalStrong> We automatically collect information about how you
          interact with the Service, including IP address, browser type, device information, pages
          visited, and timestamps. This helps us improve the Service and diagnose issues.
        </p>
        <p>
          <LegalStrong>Cookies:</LegalStrong> We use cookies and similar technologies to
          authenticate users, remember preferences, and analyze usage patterns. You can control
          cookies through your browser settings.
        </p>
      </LegalSection>

      <LegalSection title="3. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, maintain, and improve the Service</li>
          <li>Facilitate job applications and candidate evaluation</li>
          <li>Conduct AI-powered interviews and generate evaluation reports</li>
          <li>Send transactional notifications about your applications and interviews</li>
          <li>Communicate with you about your account and the Service</li>
          <li>Detect and prevent fraud, abuse, and security incidents</li>
          <li>Comply with legal obligations</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. How We Share Your Information">
        <p>
          <LegalStrong>With Companies:</LegalStrong> When you apply to a job, your profile
          information, resume, and AI interview report are shared with the company that posted the
          job. Application snapshots ensure companies see the exact information you submitted at the
          time of application.
        </p>
        <p>
          <LegalStrong>With Service Providers:</LegalStrong> We use third-party services to operate
          the Service, including:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Google</strong> for authentication (OAuth). See{" "}
            <LegalLink href="https://policies.google.com/privacy">
              Google's Privacy Policy
            </LegalLink>
            .
          </li>
          <li>
            <strong>Cloudflare</strong> for hosting, storage (including R2 and Durable Objects), AI
            infrastructure, live voice processing, and transactional email delivery. Voice speech
            processing uses Deepgram partner models hosted on Cloudflare Workers AI infrastructure.
            See{" "}
            <LegalLink href="https://www.cloudflare.com/privacypolicy/">
              Cloudflare's Privacy Policy
            </LegalLink>{" "}
            and{" "}
            <LegalLink href="https://developers.cloudflare.com/workers-ai/platform/data-usage/">
              Workers AI Data Usage
            </LegalLink>
            . Deepgram's model terms and privacy information are available through its{" "}
            <LegalLink href="https://deepgram.com/privacy">Privacy Policy</LegalLink>.
          </li>
          <li>
            <strong>OpenRouter</strong> for AI model inference during interviews and evaluations.
            See{" "}
            <LegalLink href="https://openrouter.ai/legal/privacy">
              OpenRouter's Privacy Policy
            </LegalLink>
            .
          </li>
        </ul>
        <p>
          <LegalStrong>For Legal Reasons:</LegalStrong> We may disclose your information if required
          by law, regulation, legal process, or governmental request.
        </p>
        <p>
          <LegalStrong>Business Transfers:</LegalStrong> If RoundZero is involved in a merger,
          acquisition, or sale of assets, your information may be transferred as part of that
          transaction.
        </p>
        <p>We do not sell your personal information to third parties.</p>
      </LegalSection>

      <LegalSection title="5. Data Storage and Security">
        <p>
          Your data is stored on secure servers managed by Cloudflare and our database providers. We
          use industry-standard security measures including encryption in transit (TLS), access
          controls, and regular security audits.
        </p>
        <p>
          Resumes and company logos are stored in Cloudflare R2. File access is mediated through our
          servers — we do not expose direct public download links for private uploads. Interview
          transcripts and evaluation data are stored securely and access is restricted to authorized
          personnel and the company you applied to.
        </p>
        <p>
          While we take reasonable precautions, no system is completely secure. We cannot guarantee
          the absolute security of your data.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Retention and Account Deletion">
        <p>
          We retain your personal information for as long as necessary to provide the Service and
          fulfill the purposes outlined in this Privacy Policy. Specifically:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Account and profile data are retained while your account is active.</li>
          <li>
            Application data and interview transcripts are retained for the duration of the hiring
            process and a reasonable period afterward to support disputes or audits.
          </li>
          <li>
            Reconnectable voice-session history may remain in Cloudflare Durable Object storage for
            up to seven days. The final transcript follows the interview retention described above;
            account erasure clears both copies.
          </li>
          <li>
            Usage and log data are retained for a shorter period, typically up to 12 months, unless
            longer retention is required for security or legal purposes.
          </li>
        </ul>
        <p>
          <LegalStrong>Deleting your account:</LegalStrong> You can delete your account at any time
          from{" "}
          <Link
            to="/dashboard/settings"
            className="text-foreground underline underline-offset-2 hover:text-foreground/80"
          >
            Settings
          </Link>{" "}
          (candidates and companies). When you confirm deletion:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Your account is deactivated immediately and you are signed out. You will no longer
            appear in public listings or be able to use the Service until restored.
          </li>
          <li>
            You have <LegalStrong>30 days</LegalStrong> to change your mind. If you sign back in
            with the same Google account during this grace period, your account is restored
            automatically.
          </li>
          <li>
            After 30 days, we permanently erase your personal data. This includes your profile,
            resumes, voice audio, interview message content, voice transcripts, application
            snapshots, notifications, and feedback. Evaluation report text fields are redacted;
            numeric scores and recommendation labels already shared with a company may be retained
            in anonymized form so hiring teams keep a consistent record.
          </li>
          <li>
            If you are the sole active member of a company workspace, open jobs for that company may
            be closed when your account is erased.
          </li>
        </ul>
        <p>
          Erasure runs automatically on a daily schedule. Once the grace period ends, deletion
          cannot be undone.
        </p>
      </LegalSection>

      <LegalSection title="7. Your Rights">
        <p>
          Depending on your location, you may have certain rights regarding your personal
          information, including:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>The right to access the personal information we hold about you</li>
          <li>
            The right to correct inaccurate or incomplete information (via your profile settings)
          </li>
          <li>The right to delete your personal information (via Settings → Delete account)</li>
          <li>The right to restrict or object to certain processing activities</li>
          <li>The right to data portability</li>
          <li>The right to withdraw consent where processing is based on consent</li>
        </ul>
        <p>
          For account deletion, use the self-service control in Settings. For other privacy
          requests, contact us at{" "}
          <LegalLink href="mailto:support@tryroundzero.com">support@tryroundzero.com</LegalLink>. We
          will respond within a reasonable timeframe.
        </p>
      </LegalSection>

      <LegalSection title="8. International Data Transfers">
        <p>
          RoundZero operates globally. Your information may be transferred to and processed in
          countries other than your own, including the United States. We ensure appropriate
          safeguards are in place to protect your information during such transfers.
        </p>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <p>
          The Service is not intended for individuals under the age of 16. We do not knowingly
          collect personal information from children under 16. If we become aware that we have
          collected such information, we will take steps to delete it promptly.
        </p>
      </LegalSection>

      <LegalSection title="10. AI and Automated Decision-Making">
        <p>
          RoundZero uses artificial intelligence to conduct interviews and generate candidate
          evaluations. These systems analyze interview transcripts and profile data to produce
          structured reports with scores and recommendations.
        </p>
        <p>
          Our AI systems are designed to be explainable: every report includes specific reasoning
          linked to evidence in the conversation. However, these reports are assistive tools and
          should not be the sole basis for hiring decisions. Companies retain full discretion in
          their hiring choices.
        </p>
        <p>
          If you believe an AI evaluation contains a significant error, you may contact us to
          request a review.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we will
          notify you through the Service or by email. Your continued use of the Service after
          changes take effect constitutes acceptance of the updated policy.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact Us">
        <p>
          If you have any questions or concerns about this Privacy Policy or our data practices,
          please contact us at:{" "}
          <LegalLink href="mailto:support@tryroundzero.com">support@tryroundzero.com</LegalLink>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
