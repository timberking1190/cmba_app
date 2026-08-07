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
      title="The scheduling console did not load"
      body="We could not load the console just now. Trying again usually works. Any games you already published are unaffected."
      homeHref="/manage"
      homeLabel="Go to the console"
      onRetry={reset}
      digest={error.digest}
    />
  );
}
