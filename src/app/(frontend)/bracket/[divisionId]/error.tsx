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
      title="The bracket did not load"
      body="We could not reach this division bracket just now. Trying again usually works."
      homeHref="/standings"
      homeLabel="Go to standings"
      onRetry={reset}
      digest={error.digest}
    />
  );
}
