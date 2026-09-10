"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

// What a server-rendered screen shows while its data is on the way — the
// loading.tsx files are built from these. Outlines, not spinners: each loading
// screen is drawn in the shape of the page it stands in for, so the page
// arriving fills the outline in rather than replacing it. The pulse is
// motion-safe; someone who asked their OS for no animation gets a still outline.
//
// A client component on purpose, though it has no state. Next renders a
// segment's loading (and not-found) element alongside its layout rather than
// inside it, so on the server it can run before app/[locale]/layout.tsx has
// called setRequestLocale. next-intl then falls back to reading the request
// headers — which a statically rendered route refuses: the product page, which
// is ISR, answered every request with a 500. On the client the locale comes
// from NextIntlClientProvider, which already holds this locale's messages.

/** One block. Its size and radius come from the caller. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-surface-sunken motion-safe:animate-pulse", className)} />;
}

/**
 * A loading screen's frame: the page's own container, and the one thing a screen
 * reader is told. The blocks are hidden from it, so "Loading" is said once
 * instead of the outline being read out as a list of empty boxes.
 */
export function LoadingPage({ className, children }: { className?: string; children: ReactNode }) {
  const t = useTranslations("common");

  return (
    <main aria-busy="true" className={className}>
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      {children}
    </main>
  );
}

/** A grid of product-card outlines. `className` carries the grid of the page it stands in for. */
export function ProductGridSkeleton({
  count,
  className = "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5",
}: {
  count: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="bg-surface-sunken overflow-hidden rounded-[20px] motion-safe:animate-pulse"
        >
          <div className="bg-surface-muted aspect-square" />
          <div className="flex flex-col gap-2.5 p-5">
            <div className="bg-surface-muted h-3 w-20 rounded-full" />
            <div className="bg-surface-muted h-4 w-3/4 rounded-full" />
            <div className="bg-surface-muted h-4 w-1/3 rounded-full" />
            <div className="bg-surface-muted mt-1 h-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
