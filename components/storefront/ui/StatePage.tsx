import type { ReactNode } from "react";

// A whole screen that is a state rather than content: not found, or failed to
// load. One heading saying what happened, one sentence saying why, and the ways
// forward — the same shape as the order receipt, so a dead end reads as part of
// the shop and not as the framework's default page.

interface StatePageProps {
  title: string;
  message: string;
  /** The ways forward, as buttons. Never empty: a state page is not a dead end. */
  children: ReactNode;
}

export function StatePage({ title, message, children }: StatePageProps) {
  return (
    <main className="mx-auto w-full max-w-160 px-6 py-24 text-center">
      <h1 className="text-fg text-title mb-3 text-balance">{title}</h1>
      <p className="text-fg-subtle mx-auto mb-8 max-w-[46ch] text-[15px] leading-relaxed">
        {message}
      </p>
      <div className="flex flex-wrap justify-center gap-3.5">{children}</div>
    </main>
  );
}
