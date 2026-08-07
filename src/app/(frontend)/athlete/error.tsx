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
      title="The athlete area did not load"
      body="We could not load this page just now. Trying again usually works."
      homeHref="/athlete"
      homeLabel="Go to the athlete hub"
      onRetry={reset}
      digest={error.digest}
    />
  );
}
