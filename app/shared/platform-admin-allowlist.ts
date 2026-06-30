import { normalizeEmail } from "@/shared/google-userinfo";

export function buildPlatformAdminAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((entry) => normalizeEmail(entry))
      .filter((entry) => entry.length > 0),
  );
}

export function isPlatformAdminEmail(
  email: string | null | undefined,
  allowlist: Set<string>,
): boolean {
  if (!email || allowlist.size === 0) {
    return false;
  }

  return allowlist.has(normalizeEmail(email));
}
