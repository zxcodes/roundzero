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

type NotificationEmailTemplateProps = {
  previewText: string;
  body: string;
  ctaHref: string | null;
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
            {props.ctaHref ? (
              <Link href={props.ctaHref} style={ctaStyle}>
                Open in RoundZero
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
  body: "Senior Frontend Engineer is now interviewing.",
  ctaHref: "https://roundzero.app/dashboard/application/123",
} satisfies NotificationEmailTemplateProps;

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

const bodyTextStyle: React.CSSProperties = {
  color: "#f0f2f5",
  fontSize: "16px",
  lineHeight: "1.7",
  margin: "0",
};

const ctaStyle: React.CSSProperties = {
  backgroundColor: "#00ad9c",
  borderRadius: "999px",
  color: "#000b0a",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
  marginTop: "24px",
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
