export const SITE_NAME = "Technotopia";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export interface BreadcrumbTrailItem {
  label: string;
  href?: string;
}

/**
 * hreflang alternates for a storefront path, matching the "as-needed" locale
 * routing in i18n/routing.ts (English unprefixed at "/", Farsi under "/fa").
 * `pathname` is locale-free, e.g. "/products" or "/products/some-slug".
 */
export function localeAlternates(pathname: string) {
  const canonicalPath = pathname === "/" ? "" : pathname;
  return {
    canonical: `${SITE_URL}${canonicalPath}`,
    languages: {
      en: `${SITE_URL}${canonicalPath}`,
      fa: `${SITE_URL}/fa${canonicalPath}`,
      "x-default": `${SITE_URL}${canonicalPath}`,
    },
  };
}

export function breadcrumbJsonLd(items: BreadcrumbTrailItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: new URL(item.href, SITE_URL).toString() } : {}),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  };
}
