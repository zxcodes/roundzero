import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/provider";

function sanitizeRedirect(url: unknown): string {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) {
    return "/";
  }
  return url;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search) => ({
    redirect: sanitizeRedirect((search as Record<string, unknown>).redirect),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.user) {
      if (!context.user.role) {
        throw redirect({ to: "/choose-role" });
      }
      throw redirect({ to: search.redirect });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Hirely</h1>
          <p className="text-muted-foreground">Sign in to get started with AI-powered interviews</p>
        </div>
        <Button variant="outline" size="lg" onClick={signIn}>
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
