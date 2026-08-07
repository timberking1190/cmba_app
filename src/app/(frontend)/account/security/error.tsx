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
      title="Your security settings did not load"
      body="We could not load your security settings just now. Trying again usually works. Your sign in method and any keys you have set up are unchanged."
      homeHref="/account"
      homeLabel="Go to your account"
      onRetry={reset}
      digest={error.digest}
    />
  );
}
