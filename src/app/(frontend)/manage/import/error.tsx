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
      title="The import screen did not load"
      body="We could not load the importer just now. Trying again usually works. No partially imported rows have been committed."
      homeHref="/manage"
      homeLabel="Go to the console"
      onRetry={reset}
      digest={error.digest}
    />
  );
}
