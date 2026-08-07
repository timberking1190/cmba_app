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
      title="The console did not load"
      body="We could not load this admin page just now. Trying again usually works. No scheduling or roster change you made has been lost."
      homeHref="/manage"
      homeLabel="Go to the console"
      onRetry={reset}
      digest={error.digest}
    />
  );
}
