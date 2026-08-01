import type { ErrorEvent, EventHint } from "@sentry/cloudflare";

import { ExpectedError } from "./expected-error";

export function filterExpectedSentryEvent(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  return hint.originalException instanceof ExpectedError ? null : event;
}

// DSN must match the Sentry project slug in vite.config.ts (`project: "roundzero"`).
// Renaming the project in Sentry UI keeps the same DSN; creating a new project does not.
export const sentryDsn =
  "https://93220926b2dbb8136dfb5e8d25f7a3fd@o4511527312687104.ingest.us.sentry.io/4511527318388736";

export const sentryOptions = {
  dsn: sentryDsn,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: filterExpectedSentryEvent,
} as const;
