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

// next/font calls have to stay at module scope — they are build-time
// declarations, not runtime calls, so they cannot be made conditional. The
// *choice* between them can be, and is, below: the two faces declare the same
// CSS variable, and only one of them is ever applied to the tree.
//
// Turning preloading off is what makes that choice mean anything. Next emits a
// <link rel="preload"> for every font in a route's module graph, which is all
// three of these on both locales — a production build of /fa preloads Plus
// Jakarta Sans and both IBM Plex Mono weights it will never paint a glyph in.
// Without those links the browser fetches a family only once it finds text
// wearing it, so English downloads the Latin face and Farsi downloads
// Vazirmatn, and neither pays for the other. The cost is that the fetch starts
// after the stylesheet rather than at head-parse; `display: swap` and the
// size-adjusted fallback face next/font generates cover the gap.
//
// The weights here are exactly the ones the type scale in globals.css and the
// call sites use — 400 body, 600 semibold, 700 bold, 800 the heading steps.
// Adding a weight to a component means adding it here too, or the browser
// synthesises it.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-storefront-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  preload: false,
});

const vazirmatn = Vazirmatn({
  variable: "--font-storefront-sans",
  subsets: ["arabic"],
  weight: ["400", "600", "700", "800"],
  preload: false,
});

// The only fixed-width text left on the storefront is the order number, which
// wants its digits to line up between the confirmation, tracking and account
// screens. Everything else that used to be mono — category eyebrows, stock
// badges, counts, the footer's phone number — is sans now.
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-storefront-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  preload: false,
});

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFarsi = locale === "fa";

  // One family per locale: the Latin faces don't cover Persian glyphs, and
  // Vazirmatn's Arabic subset is dead weight on an English page. Farsi also
  // skips the mono face entirely — Vazirmatn covers the Latin characters an
  // order number is made of, and globals.css falls `--font-mono`
  // through to the sans when --font-storefront-mono is unset.
  const sans = isFarsi ? vazirmatn : plusJakartaSans;
  const fontVariables = isFarsi ? sans.variable : `${sans.variable} ${ibmPlexMono.variable}`;

  return (
    // `sans.className` is what actually puts the face on the tree: `body` is an
    // ancestor of this element, so the --font-storefront-* variables declared
    // here are not in scope for the `body` rule in globals.css. `display:
    // contents` generates no box, but inheritance still flows through it.
    //
    // Fonts only — `data-scope="storefront"`, which used to be here too, now
    // sits on <body> in the parent layout so the palette reaches the element
    // the page ground is painted on. See app/[locale]/layout.tsx.
    <div className={`${fontVariables} ${sans.className} contents`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <StorefrontChrome>{children}</StorefrontChrome>
    </div>
  );
}
