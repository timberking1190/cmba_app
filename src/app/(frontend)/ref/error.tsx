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
      title="The official area did not load"
      body="We could not load this page just now. Trying again usually works."
      homeHref="/ref"
      homeLabel="Go to the official hub"
      onRetry={reset}
      digest={error.digest}
    />
  );
}
