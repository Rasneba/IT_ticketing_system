"use client";

import { ErrorScreen } from "@/components/error-screen";

/**
 * Outermost boundary for the app segment. Segment-level error.tsx files take
 * precedence; this catches anything that fails with no nearer boundary.
 *
 * Next 16's built-in global-error is intentionally left in place: overriding
 * it breaks the RSC client manifest and turns every render failure into a
 * raw 500.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} scope="app" />;
}
