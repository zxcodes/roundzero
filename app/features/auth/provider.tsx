import { type TokenResponse, useGoogleLogin } from "@react-oauth/google";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { createContext, use, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserRole } from "@/shared/enums";
import { currentUserQueryKey, loginWithGoogle, logout } from "./server/functions";
import {
  parseSignupSearch,
  redirectAfterSignup,
  type SignupSearch,
  toSignupRouteSearch,
} from "./signup-search";

interface AuthContextType {
  signIn: (role?: UserRole, signupSearch?: SignupSearch) => void;
  signOut: () => Promise<void>;
  isSigningIn: boolean;
  isSigningOut: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pendingRoleRef = useRef<UserRole | undefined>(undefined);
  const pendingSignupSearchRef = useRef<SignupSearch>({});
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
        const signupSearch = pendingSignupSearchRef.current;
        pendingRoleRef.current = undefined;
        pendingSignupSearchRef.current = {};

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
          await router.navigate(redirectAfterSignup(signupSearch));
        } else {
          const onboardingPath =
            result.user.role === "company" ? "/onboarding/company" : "/onboarding/candidate";
          await router.navigate({
            to: onboardingPath,
            search: toSignupRouteSearch(signupSearch),
          });
        }
        await router.invalidate();
      } catch (error) {
        console.error("Authentication error:", error);
        pendingRoleRef.current = undefined;
        pendingSignupSearchRef.current = {};
        const message =
          error instanceof Error && error.message ? error.message : "Failed to sign in with Google";
        toast.error(message);
      } finally {
        setIsSigningIn(false);
      }
    },
    onError: () => {
      pendingRoleRef.current = undefined;
      pendingSignupSearchRef.current = {};
      setIsSigningIn(false);
      toast.error("Google sign in failed");
    },
    onNonOAuthError: (e) => {
      if (e.type === "popup_closed") {
        setIsSigningIn(false);
      }
    },
  });

  const signIn = (role?: UserRole, signupSearch?: SignupSearch) => {
    setIsSigningIn(true);
    pendingRoleRef.current = role;
    pendingSignupSearchRef.current = parseSignupSearch(signupSearch);
    login();
  };

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      queryClient.setQueryData(currentUserQueryKey, null);
      await router.navigate({ to: "/" });
      await router.invalidate();
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
