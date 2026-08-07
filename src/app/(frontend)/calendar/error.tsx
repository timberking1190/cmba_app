"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/states/ErrorState";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error boundary:", error);
  }, [error]);

  return (
    <ErrorState
      title="The schedule did not load"
      body="We could not reach the game schedule just now. This is usually a brief connection problem, so trying again often works. Game times are also posted in TeamLinkt."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
