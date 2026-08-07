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
      title="Your account page did not load"
      body="We could not load your account just now. Trying again usually works. Nothing in your account has changed."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
