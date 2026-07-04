import * as Sentry from "@sentry/tanstackstart-react";
import { Await, useRouter } from "@tanstack/react-router";
import { Component, type ErrorInfo, type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DeferredSectionProps<T> = {
  promise: Promise<T>;
  fallback: ReactNode;
  children: (data: T) => ReactNode;
  sectionLabel?: string;
  /** When this changes, drop the cached value and show fallback until the new promise resolves. */
  resetKey?: string | number;
};

/**
 * Per-section Suspense + error recovery for TanStack Router deferred loaders.
 *
 * Public `Await` suspends on every pending promise. Synchronous deferred loaders
 * (`loader: () => ({ key: serverFn() })`) finish immediately and swap in new
 * pending promise references on `router.invalidate()`, which would reflash
 * skeletons even though prior data was already on screen. When we already have
 * a resolved value, keep it visible and subscribe to the replacement promise via
 * the standard Promise API instead of suspending again.
 */
function DeferredSectionContent<T>({
  promise,
  fallback,
  children,
  resetKey,
}: {
  promise: Promise<T>;
  fallback: ReactNode;
  children: (data: T) => ReactNode;
  resetKey?: string | number;
}) {
  const cacheRef = useRef<{ hasValue: boolean; data: T }>({
    hasValue: false,
    data: undefined as T,
  });
  const [, setVersion] = useState(0);
  const prevResetKey = useRef(resetKey);

  useEffect(() => {
    if (resetKey === undefined) {
      return;
    }

    if (prevResetKey.current !== resetKey) {
      prevResetKey.current = resetKey;
      cacheRef.current = { hasValue: false, data: undefined as T };
      setVersion((current) => current + 1);
    }
  }, [resetKey]);

  useEffect(() => {
    if (!cacheRef.current.hasValue) {
      return;
    }

    let active = true;

    void promise
      .then((data) => {
        if (!active) {
          return;
        }

        cacheRef.current = { hasValue: true, data };
        setVersion((current) => current + 1);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        if (!import.meta.env.DEV) {
          Sentry.captureException(error);
          return;
        }

        console.error("[DeferredSection] background refresh failed", error);
      });

    return () => {
      active = false;
    };
  }, [promise]);

  if (cacheRef.current.hasValue) {
    return children(cacheRef.current.data);
  }

  return (
    <Await promise={promise} fallback={fallback}>
      {(data) => {
        cacheRef.current = { hasValue: true, data };
        return children(data);
      }}
    </Await>
  );
}

function SectionErrorFallback({
  sectionLabel,
  isRetrying,
  onRetry,
}: {
  sectionLabel?: string;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  const label = sectionLabel ? `Couldn't load ${sectionLabel}.` : "Couldn't load this section.";

  return (
    <Card variant="dashboard-panel" className="px-6 py-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? "Retrying" : "Try again"}
      </Button>
    </Card>
  );
}

class SectionErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { error: Error | null }
> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!import.meta.env.DEV) {
      Sentry.captureException(error, {
        extra: { componentStack: errorInfo.componentStack },
      });
      return;
    }

    console.error("[DeferredSection]", error, errorInfo);
  }

  override render() {
    if (this.state.error) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export function DeferredSection<T>({
  promise,
  fallback,
  children,
  sectionLabel,
  resetKey,
}: DeferredSectionProps<T>) {
  const router = useRouter();
  const [retryKey, setRetryKey] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const onRetry = () => {
    void retrySection();
  };

  const retrySection = async () => {
    setIsRetrying(true);
    try {
      await router.invalidate();
      setRetryKey((current) => current + 1);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <SectionErrorBoundary
      key={retryKey}
      fallback={
        <SectionErrorFallback
          sectionLabel={sectionLabel}
          isRetrying={isRetrying}
          onRetry={onRetry}
        />
      }
    >
      <DeferredSectionContent promise={promise} fallback={fallback} resetKey={resetKey}>
        {children}
      </DeferredSectionContent>
    </SectionErrorBoundary>
  );
}
