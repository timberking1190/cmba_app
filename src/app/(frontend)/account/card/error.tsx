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
      title="Your member card did not load"
      body="We could not load your card just now. Trying again usually works. If you are somewhere with no signal, your card is also available in your phone wallet once you have added it."
      homeHref="/account"
      homeLabel="Go to your account"
      onRetry={reset}
      digest={error.digest}
    />
  );
}
