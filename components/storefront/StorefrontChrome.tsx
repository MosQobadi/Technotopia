"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "./Footer";
import { MinimalHeader } from "./MinimalHeader";
import { Navbar } from "./Navbar";

// Full Navbar, no Footer: account screens are a logged-in dashboard, not a shopping surface.
const NO_FOOTER_PREFIXES = ["/account"];

// Minimal Header, no Footer: focused, low-distraction flows (auth, checkout, order status).
const MINIMAL_HEADER_PREFIXES = ["/login", "/checkout", "/orders"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function StorefrontChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (matchesPrefix(pathname, MINIMAL_HEADER_PREFIXES)) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <MinimalHeader />
        {children}
      </div>
    );
  }

  const showFooter = !matchesPrefix(pathname, NO_FOOTER_PREFIXES);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar />
      {children}
      {showFooter && <Footer />}
    </div>
  );
}
