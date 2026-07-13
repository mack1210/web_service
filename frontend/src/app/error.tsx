"use client";

import { ErrorPanel } from "@/components/ui/state-panels";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPanel message="An unexpected page error occurred. Your navigation context is still available." onRetry={reset} />;
}
