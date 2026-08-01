import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react";
import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { expectedErrorAdapter } from "@/shared/expected-error";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [sentryGlobalRequestMiddleware, csrfMiddleware],
  functionMiddleware: [sentryGlobalFunctionMiddleware],
  serializationAdapters: [expectedErrorAdapter],
}));
