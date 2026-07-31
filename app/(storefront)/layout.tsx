import type { ReactNode } from "react";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { StorefrontChrome } from "@/components/storefront/StorefrontChrome";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-scope="storefront"
      className={`${plusJakartaSans.variable} ${ibmPlexMono.variable} contents`}
    >
      <StorefrontChrome>{children}</StorefrontChrome>
    </div>
  );
}
