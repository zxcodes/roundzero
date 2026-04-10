type NotificationEmailTemplateProps = {
  body: string;
  ctaHref: string | null;
};

export function NotificationEmailTemplate(props: NotificationEmailTemplateProps) {
  return (
    <div
      style={{
        backgroundColor: "#0b0b0f",
        color: "#f5f7fb",
        fontFamily:
          '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "32px 20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#111318",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          margin: "0 auto",
          maxWidth: "560px",
          padding: "32px",
        }}
      >
        <p
          style={{
            color: "#00c8bc",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.24em",
            margin: "0 0 16px",
            textTransform: "uppercase",
          }}
        >
          RoundZero
        </p>
        <p
          style={{
            color: "#d4dae5",
            fontSize: "16px",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {props.body}
        </p>
        {props.ctaHref ? (
          <a
            href={props.ctaHref}
            style={{
              backgroundColor: "#00c8bc",
              borderRadius: "999px",
              color: "#071014",
              display: "inline-block",
              fontSize: "14px",
              fontWeight: 700,
              marginTop: "24px",
              padding: "12px 18px",
              textDecoration: "none",
            }}
          >
            Open in RoundZero
          </a>
        ) : null}
      </div>
    </div>
  );
}
