import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeGuard } from "@/components/storefront/ThemeGuard";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";
import { THEME_INIT_SCRIPT } from "@/lib/storefront/theme";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Every relative URL in a descendant's metadata is resolved against this. The one
// that exists today is the product detail page's `openGraph.images`, which is the
// row's stored "/uploads/<file>" path. With no metadataBase Next does not fall back
// to the request's origin — it falls back to `http://localhost:<port>`, so a
// production build advertises og:image URLs pointing at the container's own
// loopback address, and ISR caches them. Only visible in a production build:
// `next build` prints the "metadataBase property ... is not set" warning, and
// nothing in dev looks wrong because localhost is where dev really is.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

// This is its own root layout (own <html>) rather than nesting under a
// single app-wide root — deriving lang/dir straight from the `locale` route
// param (no request-header threading through proxy.ts needed) keeps this
// segment eligible for static rendering via setRequestLocale below, which
// matters for storefront SEO/performance. See app/admin/layout.tsx for the
// sibling root layout this pattern requires.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enables static rendering for this locale (next-intl requirement).
  setRequestLocale(locale);

  const dir = locale === "fa" ? "rtl" : "ltr";

  return (
    // `suppressHydrationWarning` covers exactly one attribute: the `data-theme`
    // the script below sets on this element before React ever sees it. Without
    // it React reports the mismatch it caused itself.
    //
    // Note what is deliberately *not* here: the theme is not part of
    // `className`. React rewrites that attribute whenever it changes, and a
    // locale switch re-renders this layout — which would silently reset a theme
    // added as a class. See lib/storefront/theme.ts.
    <html lang={locale} dir={dir} className="h-full antialiased" suppressHydrationWarning>
      {/* `data-scope="storefront"` is what selects the storefront palette in
          globals.css, and it sits on <body> rather than further down because
          <body> is the element the page ground is painted on — a token that
          only exists below it would leave the ground to the browser's own
          canvas colour. Safe here because `app/[locale]` is the storefront and
          nothing else; the admin is a separate root layout that never gets
          this attribute, which is what keeps the two palettes apart. */}
      <body data-scope="storefront" className="flex min-h-full flex-col">
        {/* Before first paint, deliberately: see THEME_INIT_SCRIPT. A Client
            Component cannot do this job — it only runs after hydration, by
            which time the wrong theme has already been on screen. First child
            of <body> so it blocks on the way past, ahead of any markup that
            could be painted in the wrong theme.

            React logs "Encountered a script tag while rendering React
            component" for this in development, and it is not wrong: this runs
            on the initial document and never again, which is precisely why
            ThemeGuard below has to exist. The warning is dev-only and there is
            no placement that avoids it — next/script wraps the same element.
            Do not "fix" it by deleting the script; that trades a console note
            for a flash of the wrong theme on every cold load. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Renders nothing; restores the theme attribute React strips off
            <html> when a locale switch re-renders this layout. */}
        <ThemeGuard />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
