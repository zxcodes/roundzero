import * as Sentry from "@sentry/tanstackstart-react";
import { StartClient } from "@tanstack/react-start/client";
import { Component, type ErrorInfo, type ReactNode, StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

import { Button } from "@/components/ui/button";

interface RootRecoveryBoundaryProps {
  children: ReactNode;
}

interface RootRecoveryBoundaryState {
  failed: boolean;
}

class RootRecoveryBoundary extends Component<RootRecoveryBoundaryProps, RootRecoveryBoundaryState> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    Sentry.captureException(error ?? new Error("Router render failed with an empty error value"), {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }

  onReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.failed) {
      return (
        <main className="flex min-h-svh items-center justify-center p-6">
          <section className="w-full max-w-md space-y-4 rounded-3xl border border-border/60 p-6 text-center">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                Refresh the page to finish loading your workspace.
              </p>
            </div>
            <Button type="button" onClick={this.onReload}>
              Refresh page
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RootRecoveryBoundary>
        <StartClient />
      </RootRecoveryBoundary>
    </StrictMode>,
  );
});
