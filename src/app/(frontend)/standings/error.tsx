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
      title="The standings did not load"
      body="We could not reach the standings just now. Trying again usually works. Nothing about your team record has changed."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
