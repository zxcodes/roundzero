import { type TokenResponse, useGoogleLogin } from "@react-oauth/google";
import { useRouter } from "@tanstack/react-router";
import { createContext, use, useRef } from "react";
import { toast } from "sonner";
import type { UserRole } from "@/shared/enums";
import { loginWithGoogle, logout } from "./server/functions";

interface AuthContextType {
  signIn: (role?: UserRole) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pendingRoleRef = useRef<UserRole | undefined>(undefined);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse: TokenResponse) => {
      try {
        const result = await loginWithGoogle({
          data: {
            access_token: tokenResponse.access_token,
            role: pendingRoleRef.current,
          },
        });
        pendingRoleRef.current = undefined;
        await router.invalidate();

        if (result.user.role) {
          await router.navigate({ to: "/dashboard" });
        } else {
          // Shouldn't happen with role-based login, but fallback
          await router.navigate({ to: "/" });
        }
      } catch (error) {
        console.error("Authentication error:", error);
        pendingRoleRef.current = undefined;
        toast.error("Failed to sign in with Google");
      }
    },
    onError: () => {
      pendingRoleRef.current = undefined;
      toast.error("Google sign in failed");
    },
  });

  const signIn = (role?: UserRole) => {
    pendingRoleRef.current = role;
    login();
  };

  const signOut = async () => {
    try {
      await logout();
      await router.invalidate();
      await router.navigate({ to: "/" });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to sign out");
    }
  };

  return <AuthContext value={{ signIn, signOut }}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
