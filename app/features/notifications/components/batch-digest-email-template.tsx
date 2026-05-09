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
import { emailTheme } from "./email-theme";

type BatchDigestEmailTemplateProps = {
  jobTitle: string;
  reportCount: number;
  topScore: number | null;
  topCandidateName: string | null;
  batchUrl: string;
};

export function BatchDigestEmailTemplate(props: BatchDigestEmailTemplateProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {String(props.reportCount)} candidate evaluation{props.reportCount === 1 ? "" : "s"} ready
        for {props.jobTitle}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={brandStyle}>RoundZero</Text>
          </Section>
          <Section style={contentStyle}>
            <Text style={headingStyle}>Batch Ready</Text>
            <Text style={bodyTextStyle}>
              <strong>
                {String(props.reportCount)} candidate evaluation{props.reportCount === 1 ? "" : "s"}
              </strong>{" "}
              for <strong>{props.jobTitle}</strong> are ready for review.
            </Text>

            {props.topScore !== null && props.topCandidateName ? (
              <Text style={highlightStyle}>
                <span style={highlightLabelStyle}>Top candidate</span>
                <span style={highlightValueStyle}>
                  {props.topCandidateName} — {props.topScore}/100
                </span>
              </Text>
            ) : null}

            <Text style={bodyTextStyle}>
              All candidates are ranked side-by-side so you can compare and make faster decisions.
            </Text>

            <Link href={props.batchUrl} style={ctaStyle}>
              Review Ranked Candidates
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

BatchDigestEmailTemplate.PreviewProps = {
  jobTitle: "Senior Frontend Engineer",
  reportCount: 5,
  topScore: 92,
  topCandidateName: "Sarah Chen",
  batchUrl: "https://roundzero.dev/dashboard/job-batches/123",
} satisfies BatchDigestEmailTemplateProps;

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

const highlightStyle: React.CSSProperties = {
  backgroundColor: emailTheme.colors.subtleSurface,
  borderRadius: emailTheme.radii.block,
  display: "block",
  margin: "0 0 20px",
  padding: "16px 20px",
};

const highlightLabelStyle: React.CSSProperties = {
  color: emailTheme.colors.muted,
  display: "block",
  fontSize: "14px",
  marginBottom: "4px",
};

const highlightValueStyle: React.CSSProperties = {
  color: emailTheme.colors.ink,
  display: "block",
  fontSize: "18px",
  fontWeight: 700,
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
