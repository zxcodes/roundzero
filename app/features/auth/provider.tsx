import { type TokenResponse, useGoogleLogin } from "@react-oauth/google";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { createContext, use, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserRole } from "@/shared/enums";
import { currentUserQueryKey, loginWithGoogle, logout } from "./server/functions";

interface AuthContextType {
  signIn: (role?: UserRole, redirectTo?: string) => void;
  signOut: () => Promise<void>;
  isSigningIn: boolean;
  isSigningOut: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pendingRoleRef = useRef<UserRole | undefined>(undefined);
  const pendingRedirectRef = useRef<string | undefined>(undefined);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse: TokenResponse) => {
      try {
        const result = await loginWithGoogle({
          data: {
            access_token: tokenResponse.access_token,
            role: pendingRoleRef.current,
          },
        });
        const redirectTo = pendingRedirectRef.current;
        pendingRoleRef.current = undefined;
        pendingRedirectRef.current = undefined;

        // Seed the cache with the freshly-authenticated user so
        // `__root.beforeLoad` hits warm cache instead of round-tripping.
        queryClient.setQueryData(currentUserQueryKey, result.user);

        if (result.restored) {
          toast.success("Welcome back! Your account deletion has been cancelled.");
        }

        if (!result.user.role) {
          await router.invalidate();
          setIsSigningIn(false);
          return;
        }

        if (result.onboardingComplete) {
          await router.navigate({ to: redirectTo ?? "/dashboard" });
        } else {
          const onboardingPath =
            result.user.role === "company" ? "/onboarding/company" : "/onboarding/candidate";
          await router.navigate({
            to: onboardingPath,
            search: redirectTo ? { redirect: redirectTo } : {},
          });
        }
        await router.invalidate();
      } catch (error) {
        console.error("Authentication error:", error);
        pendingRoleRef.current = undefined;
        pendingRedirectRef.current = undefined;
        toast.error("Failed to sign in with Google");
      } finally {
        setIsSigningIn(false);
      }
    },
    onError: () => {
      pendingRoleRef.current = undefined;
      pendingRedirectRef.current = undefined;
      setIsSigningIn(false);
      toast.error("Google sign in failed");
    },
  });

  const signIn = (role?: UserRole, redirectTo?: string) => {
    setIsSigningIn(true);
    pendingRoleRef.current = role;
    pendingRedirectRef.current = redirectTo;
    login();
  };

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      // Seed the cache with null so `__root.beforeLoad` hits warm cache
      // instead of round-tripping to confirm the session is gone.
      queryClient.setQueryData(currentUserQueryKey, null);
      await router.invalidate();
      await router.navigate({ to: "/" });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <AuthContext value={{ signIn, signOut, isSigningIn, isSigningOut }}>{children}</AuthContext>
  );
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
