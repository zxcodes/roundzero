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

type JobMatchDigestEmailTemplateProps = {
  jobs: Array<{ jobId: string; title: string; companyName: string }>;
  jobsUrl: string;
};

export function JobMatchDigestEmailTemplate({ jobs, jobsUrl }: JobMatchDigestEmailTemplateProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {String(jobs.length)} strong job {jobs.length === 1 ? "match" : "matches"} for you
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={contentStyle}>
            <Text style={brandStyle}>RoundZero</Text>
            <Text style={headingStyle}>New strong matches</Text>
            <Text style={copyStyle}>These roles line up especially well with your resume.</Text>
            {jobs.map((job) => (
              <Section key={job.jobId} style={jobStyle}>
                <Text style={jobTitleStyle}>{job.title}</Text>
                <Text style={companyStyle}>{job.companyName}</Text>
              </Section>
            ))}
            <Link href={jobsUrl} style={ctaStyle}>
              View your matches
            </Link>
          </Section>
          <Hr style={dividerStyle} />
          <Text style={footerStyle}>Manage job-match emails in your RoundZero settings.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: emailTheme.colors.pageBg,
  fontFamily: emailTheme.fontFamily,
  margin: 0,
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
const contentStyle: React.CSSProperties = { padding: "32px" };
const brandStyle: React.CSSProperties = {
  color: emailTheme.colors.accent,
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.24em",
  margin: "0 0 18px",
  textTransform: "uppercase",
};
const headingStyle: React.CSSProperties = {
  color: emailTheme.colors.ink,
  fontSize: "22px",
  fontWeight: 700,
  margin: "0 0 10px",
};
const copyStyle: React.CSSProperties = {
  color: emailTheme.colors.muted,
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 20px",
};
const jobStyle: React.CSSProperties = {
  backgroundColor: emailTheme.colors.subtleSurface,
  borderRadius: emailTheme.radii.block,
  margin: "0 0 10px",
  padding: "14px 16px",
};
const jobTitleStyle: React.CSSProperties = {
  color: emailTheme.colors.ink,
  fontSize: "15px",
  fontWeight: 700,
  margin: "0 0 4px",
};
const companyStyle: React.CSSProperties = {
  color: emailTheme.colors.muted,
  fontSize: "13px",
  margin: 0,
};
const ctaStyle: React.CSSProperties = {
  backgroundColor: emailTheme.colors.accent,
  borderRadius: emailTheme.radii.pill,
  color: emailTheme.colors.accentText,
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
  marginTop: "12px",
  padding: "12px 18px",
  textDecoration: "none",
};
const dividerStyle: React.CSSProperties = {
  borderColor: emailTheme.colors.divider,
  borderStyle: "solid",
  borderWidth: "1px 0 0",
  margin: 0,
};
const footerStyle: React.CSSProperties = {
  color: emailTheme.colors.muted,
  fontSize: "12px",
  lineHeight: "1.6",
  margin: 0,
  padding: "22px 32px",
};
