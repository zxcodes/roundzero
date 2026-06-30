import { appEnv } from "@/shared/env.app";
import {
  buildPlatformAdminAllowlist,
  isPlatformAdminEmail,
} from "@/shared/platform-admin-allowlist";

export {
  buildPlatformAdminAllowlist,
  isPlatformAdminEmail,
} from "@/shared/platform-admin-allowlist";

export function isPlatformAdmin(email: string | null | undefined): boolean {
  return isPlatformAdminEmail(email, buildPlatformAdminAllowlist(appEnv.PLATFORM_ADMIN_EMAILS));
}
