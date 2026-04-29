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

type NotificationEmailTemplateProps = {
  previewText: string;
  body: string;
  ctaHref: string | null;
  ctaLabel?: string;
  deadlineText?: string | null;
};

export function NotificationEmailTemplate(props: NotificationEmailTemplateProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{props.previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={brandStyle}>RoundZero</Text>
          </Section>
          <Section style={contentStyle}>
            <Text style={bodyTextStyle}>{props.body}</Text>
            {props.deadlineText ? <Text style={deadlineStyle}>{props.deadlineText}</Text> : null}
            {props.ctaHref ? (
              <Link href={props.ctaHref} style={ctaStyle}>
                {props.ctaLabel ?? "Open in RoundZero"}
              </Link>
            ) : null}
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

NotificationEmailTemplate.PreviewProps = {
  previewText: "Acme Corp updated your application",
  body: "Your application for Senior Frontend Engineer at Acme Corp is now interviewing.",
  ctaHref: "https://roundzero.app/dashboard/application/123",
  ctaLabel: "View Application",
  deadlineText: null,
} satisfies NotificationEmailTemplateProps;

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
  margin: "0",
};

const ctaStyle: React.CSSProperties = {
  backgroundColor: emailTheme.colors.accent,
  borderRadius: emailTheme.radii.pill,
  color: emailTheme.colors.accentText,
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
  marginTop: "24px",
  padding: "12px 18px",
  textDecoration: "none",
};

const deadlineStyle: React.CSSProperties = {
  color: emailTheme.colors.ink,
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "16px 0 0",
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
