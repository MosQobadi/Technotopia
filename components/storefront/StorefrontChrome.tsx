"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";

const CHROME_LESS_ROUTES = ["/login", "/signup"];

export function StorefrontChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (CHROME_LESS_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar />
      {children}
    </div>
  );
}
