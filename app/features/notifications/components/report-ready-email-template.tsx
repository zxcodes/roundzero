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

import { type Recommendation, recommendationLabels } from "@/shared/enums";
import { formatCandidateScoreWithScale } from "@/shared/score";
import { EMAIL_PREVIEW } from "@/shared/seo";

import { emailTheme } from "./email-theme";

type ReportReadyEmailTemplateProps = {
  candidateName: string;
  jobTitle: string;
  overallScore: number;
  recommendation: Recommendation;
  reportUrl: string;
};

export function ReportReadyEmailTemplate(props: ReportReadyEmailTemplateProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{EMAIL_PREVIEW.candidateReportReady}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={brandStyle}>RoundZero</Text>
          </Section>
          <Section style={contentStyle}>
            <Text style={headingStyle}>Evaluation Ready</Text>
            <Text style={bodyTextStyle}>
              The AI evaluation for <strong>{props.candidateName}</strong> applied for{" "}
              <strong>{props.jobTitle}</strong> is ready for review.
            </Text>
            <Text style={scoresContainerStyle}>
              <span style={scoreLabelStyle}>Overall Score</span>
              <span style={scoreValueStyle}>
                {formatCandidateScoreWithScale(props.overallScore)}
              </span>
            </Text>
            <Text style={recommendationStyle}>
              Recommendation: {recommendationLabels[props.recommendation]}
            </Text>
            <Link href={props.reportUrl} style={ctaStyle}>
              View Full Report
            </Link>
          </Section>
          <Hr style={dividerStyle} />
          <Section style={footerSectionStyle}>
            <Text style={footerStyle}>
              You received this because you have a RoundZero account. You can manage your
              notification preferences in your account settings.
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

ReportReadyEmailTemplate.PreviewProps = {
  candidateName: "John Doe",
  jobTitle: "Senior Frontend Engineer",
  overallScore: 8.2,
  recommendation: "yes" as const,
  reportUrl: "https://tryroundzero.com/dashboard/applicant-reports/123",
} satisfies ReportReadyEmailTemplateProps;

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
  fontWeight: 700,
  lineHeight: "1.3",
  margin: "0 0 16px",
};

const bodyTextStyle: React.CSSProperties = {
  color: emailTheme.colors.ink,
  fontSize: "16px",
  lineHeight: "1.7",
  margin: "0 0 20px",
};

const scoresContainerStyle: React.CSSProperties = {
  backgroundColor: emailTheme.colors.subtleSurface,
  borderRadius: emailTheme.radii.block,
  display: "block",
  margin: "0 0 12px",
  padding: "16px 20px",
};

const scoreLabelStyle: React.CSSProperties = {
  color: emailTheme.colors.muted,
  fontSize: "14px",
  marginRight: "8px",
};

const scoreValueStyle: React.CSSProperties = {
  color: emailTheme.colors.ink,
  fontSize: "18px",
  fontWeight: 700,
};

const recommendationStyle: React.CSSProperties = {
  color: emailTheme.colors.ink,
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const ctaStyle: React.CSSProperties = {
  backgroundColor: emailTheme.colors.accent,
  borderRadius: emailTheme.radii.pill,
  color: emailTheme.colors.accentText,
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
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
