"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { MiniCart } from "@/components/storefront/cart/MiniCart";
import { HeaderIconButton } from "@/components/storefront/ui/HeaderIconButton";
import { HeartIcon, PersonIcon } from "@/components/storefront/icons";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavDrawer } from "./NavDrawer";
import { NAV_LINKS, NAV_PAGES } from "./navLinks";
import { NavbarSearch } from "./NavbarSearch";
import { ThemeToggle } from "./ThemeToggle";

// Two shapes, one row of markup. Below `md` the bar is menu / wordmark /
// mini-cart with the search wrapping underneath, and everything else is in the
// drawer; from `md` up the section links and the rest of the controls come back
// out onto the bar. The cart is the one control that is in both, because it is
// the one that has to be able to answer an add wherever the customer is.

export function Navbar() {
  const t = useTranslations("nav");
  const user = useAuthStore((state) => state.user);
  const hydrateAuth = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "";

  return (
    <header className="border-line bg-surface sticky top-0 z-20 border-b">
      <div className="mx-auto flex max-w-320 flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3.5">
        <NavDrawer links={NAV_LINKS} initials={initials} />

        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <span className="bg-accent size-2.5 rounded-full" aria-hidden />
          <span className="text-fg text-lg font-extrabold tracking-tight">Technotopia</span>
        </Link>

        <nav aria-label={t("primaryNav")} className="hidden shrink-0 gap-5 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-fg-muted hover:text-fg text-sm font-semibold"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        {/* Last in the source order on a phone, where it wraps to its own line,
            and back in place from `md` up. */}
        <div className="order-last flex flex-1 md:order-none">
          <NavbarSearch />
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-3.5 md:ms-0">
          <div className="hidden items-center gap-3.5 md:flex">
            <LanguageSwitcher />
            <ThemeToggle />

            <HeaderIconButton href={NAV_PAGES.wishlist.href} label={t("wishlist")}>
              <HeartIcon />
            </HeaderIconButton>
          </div>

          <MiniCart />

          <HeaderIconButton
            href={user ? NAV_PAGES.account.href : "/login"}
            label={t("account")}
            tone={user ? "solid" : "sunken"}
            className="hidden md:flex"
          >
            {user ? initials : <PersonIcon />}
          </HeaderIconButton>
        </div>
      </div>
    </header>
  );
}
