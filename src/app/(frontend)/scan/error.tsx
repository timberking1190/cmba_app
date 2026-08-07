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
      title="The scanner did not load"
      body="We could not start the card scanner. Trying again usually works. If the camera does not appear after that, check that this site is allowed to use the camera in your browser settings."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
