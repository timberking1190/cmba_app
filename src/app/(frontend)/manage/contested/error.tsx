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
      title="Contested games did not load"
      body="We could not load the contested game queue just now. Trying again usually works."
      homeHref="/manage"
      homeLabel="Go to the console"
      onRetry={reset}
      digest={error.digest}
    />
  );
}
