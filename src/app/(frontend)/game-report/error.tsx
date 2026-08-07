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
      title="The game report form did not load"
      body="We could not load the form just now. Trying again usually works. Nothing you typed has been submitted."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
