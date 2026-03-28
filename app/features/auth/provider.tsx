import { type TokenResponse, useGoogleLogin } from "@react-oauth/google";
import { useRouter } from "@tanstack/react-router";
import { createContext, use, useCallback } from "react";
import { toast } from "sonner";
import { loginWithGoogle, logout } from "./server-fns";

interface AuthContextType {
  signIn: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse: TokenResponse) => {
      try {
        const result = await loginWithGoogle({
          data: { access_token: tokenResponse.access_token },
        });
        await router.invalidate();
        if (result.user.role) {
          await router.navigate({ to: "/dashboard" });
        } else {
          await router.navigate({ to: "/choose-role" });
        }
      } catch (error) {
        console.error("Authentication error:", error);
        toast.error("Failed to sign in with Google");
      }
    },
    onError: () => {
      toast.error("Google sign in failed");
    },
  });

  const signOut = useCallback(async () => {
    try {
      await logout();
      await router.invalidate();
      await router.navigate({ to: "/login", search: { redirect: "/" } });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to sign out");
    }
  }, [router]);

  return <AuthContext value={{ signIn: login, signOut }}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
