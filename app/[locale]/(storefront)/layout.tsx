import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Plus_Jakarta_Sans, Vazirmatn } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { StorefrontChrome } from "@/components/storefront/StorefrontChrome";
import { organizationJsonLd, localeAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: {
      default: t("home.title"),
      template: `%s | ${t("siteName")}`,
    },
    description: t("home.description"),
    alternates: localeAlternates("/"),
  };
}

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

// next/font calls must stay at module scope (can't be conditional on
// locale) — Latin fonts above don't cover Persian glyphs, so Farsi pages
// load this alongside them and swap it in via the `html[dir="rtl"]` CSS
// override in globals.css.
const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-scope="storefront"
      className={`${plusJakartaSans.variable} ${ibmPlexMono.variable} ${vazirmatn.variable} contents`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <StorefrontChrome>{children}</StorefrontChrome>
    </div>
  );
}
