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

type CompanyInviteEmailTemplateProps = {
  companyName: string;
  inviterName: string;
  roleLabel: string;
  inviteUrl: string;
};

export function CompanyInviteEmailTemplate(props: CompanyInviteEmailTemplateProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`Join ${props.companyName} on RoundZero`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={brandStyle}>RoundZero</Text>
          </Section>
          <Section style={contentStyle}>
            <Text style={bodyTextStyle}>
              {props.inviterName} invited you to join <strong>{props.companyName}</strong> on
              RoundZero as a <strong>{props.roleLabel}</strong>.
            </Text>
            <Text style={bodyTextStyle}>
              RoundZero helps hiring teams review applicants, run AI interviews, and compare
              candidates with structured evaluation reports.
            </Text>
            <Link href={props.inviteUrl} style={ctaStyle}>
              Accept invitation
            </Link>
            <Text style={footnoteStyle}>This invitation expires in 7 days.</Text>
          </Section>
          <Hr style={dividerStyle} />
          <Section style={footerSectionStyle}>
            <Text style={footerStyle}>
              If you were not expecting this invitation, you can ignore this email.
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

CompanyInviteEmailTemplate.PreviewProps = {
  companyName: "Acme Corp",
  inviterName: "Jane Doe",
  roleLabel: "Admin",
  inviteUrl: "https://tryroundzero.com/invite/example-token",
} satisfies CompanyInviteEmailTemplateProps;

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

const footnoteStyle: React.CSSProperties = {
  color: emailTheme.colors.muted,
  fontSize: "13px",
  lineHeight: "20px",
  margin: "20px 0 0",
};

const dividerStyle: React.CSSProperties = {
  borderColor: emailTheme.colors.divider,
  margin: "0",
};

const footerSectionStyle: React.CSSProperties = {
  padding: "24px 32px",
};

const footerStyle: React.CSSProperties = {
  color: emailTheme.colors.muted,
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 8px",
};

const copyrightStyle: React.CSSProperties = {
  color: emailTheme.colors.muted,
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
};
