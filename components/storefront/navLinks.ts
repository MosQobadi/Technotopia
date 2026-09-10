import type { BreadcrumbTrailItem } from "@/lib/seo";

// The storefront's pages, described once: where each lives, which `nav` label
// names it, and which page it sits under. The header's links and every
// breadcrumb trail are read off this table, so a page is renamed or moved in
// one place rather than in every screen that points at it.

export type NavPageKey =
  | "home"
  | "shop"
  | "categories"
  | "cart"
  | "checkout"
  | "wishlist"
  | "account";

interface NavPage {
  href: string;
  parent?: NavPageKey;
}

export const NAV_PAGES: Record<NavPageKey, NavPage> = {
  home: { href: "/" },
  shop: { href: "/products", parent: "home" },
  categories: { href: "/categories", parent: "home" },
  cart: { href: "/cart", parent: "home" },
  checkout: { href: "/checkout", parent: "cart" },
  wishlist: { href: "/wishlist", parent: "home" },
  account: { href: "/account", parent: "home" },
};

// The section links, in one list because they appear twice: as the row in the
// bar on a wide screen, and as the top of the drawer on a phone.
export const NAV_LINKS = (["home", "shop", "categories"] as const).map((key) => ({
  key,
  href: NAV_PAGES[key].href,
}));

export type NavLink = (typeof NAV_LINKS)[number];

/**
 * The breadcrumb trail down to `page`, walked up its parents in the table
 * above, with anything more specific than a nav page — a category, a product —
 * appended after it. `label` is the `nav` translator. The last item is where the
 * reader already is, so it is named and not linked.
 */
export function navTrail(
  page: NavPageKey,
  label: (key: NavPageKey) => string,
  ...deeper: BreadcrumbTrailItem[]
): BreadcrumbTrailItem[] {
  const pages: BreadcrumbTrailItem[] = [];
  for (let key: NavPageKey | undefined = page; key; key = NAV_PAGES[key].parent) {
    pages.unshift({ label: label(key), href: NAV_PAGES[key].href });
  }

  return [...pages, ...deeper].map((item, index, trail) =>
    index === trail.length - 1 ? { label: item.label } : item,
  );
}
