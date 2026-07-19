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

export function withPlatformAdminStatus<T extends { email: string | null | undefined }>(user: T) {
  return {
    ...user,
    isPlatformAdmin: isPlatformAdmin(user.email),
  };
}

export function assertPlatformAdmin(email: string | null | undefined): void {
  if (!isPlatformAdmin(email)) {
    throw new Error("Not authorized");
  }
}
