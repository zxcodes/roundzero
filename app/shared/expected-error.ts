import { createSerializationAdapter } from "@tanstack/react-router";

export type ExpectedErrorCode =
  | "already_exists"
  | "conflict"
  | "expired"
  | "forbidden"
  | "invalid_input"
  | "invalid_state"
  | "not_found"
  | "quota_exceeded"
  | "setup_required"
  | "unauthenticated";

export class ExpectedError extends Error {
  readonly code: ExpectedErrorCode;

  constructor(code: ExpectedErrorCode, message: string) {
    super(message);
    this.name = "ExpectedError";
    this.code = code;
  }
}

export const expectedErrorAdapter = createSerializationAdapter({
  key: "roundzero-expected-error",
  test: (value) => value instanceof ExpectedError,
  toSerializable: ({ code, message }) => ({ code, message }),
  fromSerializable: ({ code, message }) => new ExpectedError(code, message),
});
