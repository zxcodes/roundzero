import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { emailTheme } from "@/features/notifications/components/email-theme";
import { PLAN_CONFIGS, type SubscriptionPlan } from "../config";

type SubscriptionWelcomeEmailProps = {
  plan: SubscriptionPlan;
  companyName: string;
  dashboardUrl: string;
};

export function SubscriptionWelcomeEmail(props: SubscriptionWelcomeEmailProps) {
  const planConfig = PLAN_CONFIGS[props.plan];
  const planLabel = planConfig.name;

  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to RoundZero {planLabel}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={brandStyle}>RoundZero</Text>
          </Section>
          <Section style={contentStyle}>
            <Text style={headingStyle}>You're all set, {props.companyName}</Text>
            <Text style={bodyTextStyle}>
              Thanks for subscribing to RoundZero {planLabel}. You can now post up to{" "}
              {planConfig.includedJobs} active jobs and deliver up to{" "}
              {planConfig.includedReportsPerJob} evaluation reports per job.
            </Text>
            <Text style={bodyTextStyle}>
              AI job creation, pre-evaluation, and structured reports are included.
            </Text>
            <Link href={props.dashboardUrl} style={ctaStyle}>
              Go to dashboard
            </Link>
          </Section>
          <Hr style={dividerStyle} />
          <Section style={footerSectionStyle}>
            <Text style={footerStyle}>
              You received this because you have a RoundZero account. Manage your subscription and
              billing from your dashboard.
            </Text>
            <Text style={copyrightStyle}>
              © {new Date().getFullYear()} RoundZero. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

SubscriptionWelcomeEmail.PreviewProps = {
  plan: "growth",
  companyName: "Acme Corp",
  dashboardUrl: "https://roundzero.dev/dashboard",
} satisfies SubscriptionWelcomeEmailProps;

const bodyStyle: React.CSSProperties = {
  backgroundColor: emailTheme.colors.pageBg,
  fontFamily: emailTheme.fontFamily,
  margin: "0",
  padding: "40px 20px",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: emailTheme.colors.surface,
  border: `1px solid ${emailTheme.colors.surfaceBorder}`,
  borderRadius: emailTheme.radii.card,
  margin: "0 auto",
  maxWidth: "560px",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "32px 32px 0",
};

const brandStyle: React.CSSProperties = {
  color: emailTheme.colors.accent,
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.24em",
  margin: "0",
  textTransform: "uppercase",
};

const contentStyle: React.CSSProperties = {
  padding: "20px 32px 32px",
};

const headingStyle: React.CSSProperties = {
  color: emailTheme.colors.ink,
  fontSize: "20px",
  fontWeight: 600,
  lineHeight: "1.4",
  margin: "0 0 16px",
};

const bodyTextStyle: React.CSSProperties = {
  color: emailTheme.colors.ink,
  fontSize: "16px",
  lineHeight: "1.7",
  margin: "0 0 16px",
};

const ctaStyle: React.CSSProperties = {
  backgroundColor: emailTheme.colors.accent,
  borderRadius: emailTheme.radii.pill,
  color: emailTheme.colors.accentText,
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
  marginTop: "8px",
  padding: "12px 18px",
  textDecoration: "none",
};

const dividerStyle: React.CSSProperties = {
  borderColor: emailTheme.colors.divider,
  borderStyle: "solid",
  borderWidth: "1px 0 0",
  margin: "0",
};

const footerSectionStyle: React.CSSProperties = {
  padding: "24px 32px",
};

const footerStyle: React.CSSProperties = {
  color: emailTheme.colors.muted,
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "0",
};

const copyrightStyle: React.CSSProperties = {
  color: emailTheme.colors.muted,
  fontSize: "11px",
  lineHeight: "1.5",
  margin: "12px 0 0",
};
