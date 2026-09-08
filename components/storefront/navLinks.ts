// The storefront's section links, in one list because they appear twice: as the
// row in the bar on a wide screen, and as the top of the drawer on a phone.

export const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/products", key: "shop" },
  { href: "/categories", key: "categories" },
] as const;

export type NavLink = (typeof NAV_LINKS)[number];
