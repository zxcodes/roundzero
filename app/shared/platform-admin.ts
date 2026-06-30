import { appEnv } from "@/shared/env.app";
import {
  buildPlatformAdminAllowlist,
  isPlatformAdminEmail,
} from "@/shared/platform-admin-allowlist";

export {
  buildPlatformAdminAllowlist,
  isPlatformAdminEmail,
} from "@/shared/platform-admin-allowlist";

let cachedAllowlist: Set<string> | null = null;
let cachedAllowlistRaw: string | undefined;

function getPlatformAdminAllowlist(): Set<string> {
  const raw = appEnv.PLATFORM_ADMIN_EMAILS;
  if (cachedAllowlist === null || cachedAllowlistRaw !== raw) {
    cachedAllowlistRaw = raw;
    cachedAllowlist = buildPlatformAdminAllowlist(raw);
  }

  return cachedAllowlist;
}

export function isPlatformAdmin(email: string | null | undefined): boolean {
  return isPlatformAdminEmail(email, getPlatformAdminAllowlist());
}

export function assertPlatformAdmin(email: string | null | undefined): void {
  if (!isPlatformAdmin(email)) {
    throw new Error("Not authorized");
  }
}
