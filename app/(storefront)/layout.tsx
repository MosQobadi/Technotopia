import type { ReactNode } from "react";
import { StorefrontChrome } from "@/components/storefront/StorefrontChrome";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <StorefrontChrome>{children}</StorefrontChrome>;
}
