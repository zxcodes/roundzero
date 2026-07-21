import { Buffer } from "node:buffer";

import { DocuText } from "docutext";
import mammoth from "mammoth";

import { LIMITS, sanitizeUntrustedText } from "./ai-refine";

export async function extractSanitizedResumeText(
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  let text: string;
  if (contentType === "application/pdf") {
    text = DocuText.fromBuffer(bytes).text;
  } else if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    text = result.value;
  } else {
    throw new Error(`Unsupported resume format: ${contentType}`);
  }

  return sanitizeUntrustedText(text, LIMITS.RESUME_TEXT);
}

export function resumeContentType(resumeKey: string): string {
  if (resumeKey.endsWith(".pdf")) return "application/pdf";
  if (resumeKey.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  throw new Error("Unsupported resume format");
}
