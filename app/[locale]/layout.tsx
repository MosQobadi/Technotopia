import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";
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
// matters for storefront SEO/performance. See app/admin/layout.tsx and
// app/(dev)/layout.tsx for the sibling root layouts this pattern requires.
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
    <html lang={locale} dir={dir} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
