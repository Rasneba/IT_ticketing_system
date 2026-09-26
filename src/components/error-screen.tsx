"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { buttonClass, ErrorState } from "@/components/ui";

/**
 * Shared error-boundary body. Every route group's error.tsx delegates here so
 * the failure experience is identical everywhere, with copy tailored to
 * whether the viewer is staff or an anonymous visitor.
 *
 * Note: a custom app/global-error.tsx is deliberately NOT provided. Next 16
 * ships its own, and overriding it breaks the RSC client manifest
 * ("Could not find the module ... builtin/global-error.js"), which turns every
 * render failure into a raw 500. The built-in covers failures in the root
 * layout itself.
 */
export function ErrorScreen({
  error,
  reset,
  scope = "app",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  scope?: "app" | "public";
}) {
  useEffect(() => {
    // Replace with your reporter (Sentry, OTLP, ...) in production.
    console.error("Unhandled route error:", error);
  }, [error]);

  const publicCopy = {
    title: "We could not load this page",
    description:
      "Something went wrong on our side, not yours. Your request has not been lost - please try again in a moment.",
  };
  const appCopy = {
    title: "This page could not be loaded",
    description:
      "The error was contained, so the rest of the system is unaffected. Retrying usually clears it.",
  };
  const copy = scope === "public" ? publicCopy : appCopy;

  return (
    <ErrorState
      title={copy.title}
      description={copy.description}
      detail={error.digest ? `Reference: ${error.digest}` : error.message || undefined}
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={reset} className={buttonClass("primary", "md")}>
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </button>
          <button type="button" onClick={() => window.location.reload()} className={buttonClass("secondary", "md")}>
            Reload page
          </button>
        </div>
      }
    />
  );
}
