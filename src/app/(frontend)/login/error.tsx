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
      title="The sign in page did not load"
      body="We could not load the sign in form just now. Trying again usually works. Your account is not affected."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
