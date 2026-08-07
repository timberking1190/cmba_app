"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/states/ErrorState";

/*
 * Catch-all boundary for the whole public site. Any route under (frontend) that
 * does not declare its own error.tsx lands here instead of rendering nothing,
 * which is what happened before: 49 routes, zero error boundaries.
 */

export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server side errors are already in the platform logs. This is the client half,
    // which otherwise vanishes silently, and it is the half that happens on a phone
    // with a flaky connection.
    console.error("Route error boundary:", error);
  }, [error]);

  return <ErrorState onRetry={reset} digest={error.digest} />;
}
