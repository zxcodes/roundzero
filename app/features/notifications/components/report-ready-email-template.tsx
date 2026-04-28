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

type ReportReadyEmailTemplateProps = {
  candidateName: string;
  jobTitle: string;
  overallScore: number;
  recommendation: string;
  reportUrl: string;
};

export function ReportReadyEmailTemplate(props: ReportReadyEmailTemplateProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        Evaluation ready for {props.candidateName} – {props.jobTitle}
      </Preview>
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
              <span style={scoreValueStyle}>{props.overallScore}/100</span>
            </Text>
            <Text style={recommendationStyle}>Recommendation: {props.recommendation}</Text>
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
  overallScore: 82,
  recommendation: "yes",
  reportUrl: "https://roundzero.app/dashboard/reports/123",
} satisfies ReportReadyEmailTemplateProps;

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#06070a",
  fontFamily:
    '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: "0",
  padding: "40px 20px",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#0d1014",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "20px",
  margin: "0 auto",
  maxWidth: "560px",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "32px 32px 0",
};

const brandStyle: React.CSSProperties = {
  color: "#00ad9c",
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
  color: "#f0f2f5",
  fontSize: "20px",
  fontWeight: 700,
  lineHeight: "1.3",
  margin: "0 0 16px",
};

const bodyTextStyle: React.CSSProperties = {
  color: "#f0f2f5",
  fontSize: "16px",
  lineHeight: "1.7",
  margin: "0 0 20px",
};

const scoresContainerStyle: React.CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderRadius: "12px",
  display: "block",
  margin: "0 0 12px",
  padding: "16px 20px",
};

const scoreLabelStyle: React.CSSProperties = {
  color: "#7b8189",
  fontSize: "14px",
  marginRight: "8px",
};

const scoreValueStyle: React.CSSProperties = {
  color: "#f0f2f5",
  fontSize: "18px",
  fontWeight: 700,
};

const recommendationStyle: React.CSSProperties = {
  color: "#f0f2f2f5",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const ctaStyle: React.CSSProperties = {
  backgroundColor: "#00ad9c",
  borderRadius: "999px",
  color: "#000b0a",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
  padding: "12px 18px",
  textDecoration: "none",
};

const dividerStyle: React.CSSProperties = {
  borderColor: "rgba(255, 255, 255, 0.06)",
  borderStyle: "solid",
  borderWidth: "1px 0 0",
  margin: "0",
};

const footerSectionStyle: React.CSSProperties = {
  padding: "24px 32px",
};

const footerStyle: React.CSSProperties = {
  color: "#7b8189",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "0",
};

const copyrightStyle: React.CSSProperties = {
  color: "#7b8189",
  fontSize: "11px",
  lineHeight: "1.5",
  margin: "12px 0 0",
};
