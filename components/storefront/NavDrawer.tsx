"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useDismissable } from "@/lib/storefront/useDismissable";
import { useCart } from "@/lib/store/cart";
import { HeaderIconButton } from "@/components/storefront/ui/HeaderIconButton";
import { CartIcon, HeartIcon, MenuIcon, PersonIcon } from "@/components/storefront/ui/NavIcons";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import type { NavLink } from "./navLinks";

// Everything the header cannot fit on a phone, in one panel.
//
// The bar keeps exactly three things below `md` — the menu, the wordmark and
// the mini-cart — because those are the two ways out of any page and the one
// control that has to answer an add. The section links, the wishlist, the
// account, the language switch and the theme toggle come here, and so does a
// second, plain route to the full cart: the panel that the trigger in the bar
// opens is a summary, and a customer who has opened the menu is looking for
// pages, not for a summary.

interface NavDrawerProps {
  links: readonly NavLink[];
  /** Initials when someone is signed in, empty when not — the bar's own rule. */
  initials: string;
}

export function NavDrawer({ links, initials }: NavDrawerProps) {
  const t = useTranslations("nav");
  const tCart = useTranslations("cart");
  const { itemCount } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);

  useDismissable(containerRef, isOpen, close);

  return (
    <div ref={containerRef} className="md:hidden">
      <HeaderIconButton
        label={t("menu")}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="nav-drawer"
      >
        <MenuIcon isOpen={isOpen} />
      </HeaderIconButton>

      {isOpen && (
        // Anchored to the header rather than to this button: the panel is the
        // width of the bar it hangs from, and the bar is `sticky`, which is
        // already a containing block.
        <div
          id="nav-drawer"
          className="border-line bg-surface absolute inset-x-0 top-full z-30 border-b px-6 py-4 shadow-lg"
        >
          <nav aria-label={t("menu")} className="flex flex-col">
            {links.map((link) => (
              <DrawerRow key={link.href} href={link.href} label={t(link.key)} onNavigate={close} />
            ))}

            <span className="border-line my-2 border-t" />

            <DrawerRow
              href="/cart"
              label={t("cart")}
              icon={<CartIcon />}
              meta={tCart("itemCount", { count: itemCount })}
              onNavigate={close}
            />
            <DrawerRow
              href="/wishlist"
              label={t("wishlist")}
              icon={<HeartIcon />}
              onNavigate={close}
            />
            <DrawerRow
              href={initials ? "/account" : "/login"}
              label={t("account")}
              icon={<PersonIcon />}
              meta={initials || undefined}
              onNavigate={close}
            />
          </nav>

          <div className="border-line mt-3 flex items-center gap-3.5 border-t pt-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}

function DrawerRow({
  href,
  label,
  icon,
  meta,
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: ReactNode;
  meta?: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="text-fg focus-visible:outline-accent-readable flex items-center justify-between gap-3 rounded-xl py-2.5 text-sm font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      {meta && <span className="text-fg-subtle text-xs font-normal">{meta}</span>}
    </Link>
  );
}
