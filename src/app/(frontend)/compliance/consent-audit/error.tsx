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
      title="The consent audit did not load"
      body="We could not load the consent audit just now. Trying again usually works. No consent record has been changed."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
