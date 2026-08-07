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
      title="The compliance dashboard did not load"
      body="We could not load compliance data just now. Trying again usually works."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
