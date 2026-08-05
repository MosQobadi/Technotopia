"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV_LINK_KEYS = [
  { href: "/", key: "home" },
  { href: "/products", key: "shop" },
  { href: "/categories", key: "categories" },
] as const;

const SEARCH_SCOPE_KEYS = ["all", "products", "categories", "brands"] as const;
type SearchScope = (typeof SEARCH_SCOPE_KEYS)[number];

const ICON_BUTTON_CLASSES =
  "flex size-9.5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200";

export function Navbar() {
  const t = useTranslations("nav");
  const user = useAuthStore((state) => state.user);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateCart = useCartStore((state) => state.hydrate);
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  const [scope, setScope] = useState<SearchScope>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (user) hydrateCart();
  }, [user, hydrateCart]);

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    // Scoped search actually running lands in Task 17.1 — UI only for now.
  }

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "";

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-320 flex-wrap items-center gap-6 px-6 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <span className="bg-accent size-2.5 rounded-full" aria-hidden />
          <span className="text-lg font-extrabold tracking-tight text-gray-900">Technotopia</span>
        </Link>

        <nav aria-label="Primary" className="flex shrink-0 gap-5">
          {NAV_LINK_KEYS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={handleSearchSubmit}
          role="search"
          className="flex min-w-55 flex-1 items-center overflow-hidden rounded-full bg-gray-100"
        >
          <label className="sr-only" htmlFor="navbar-search-scope">
            {t("searchScope")}
          </label>
          <select
            id="navbar-search-scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as SearchScope)}
            className="h-10 shrink-0 rounded-full bg-transparent py-0 ps-3.5 pe-1.5 text-xs text-gray-500 outline-none"
          >
            {SEARCH_SCOPE_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`searchScopeOptions.${key}`)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="navbar-search-input">
            {t("search")}
          </label>
          <input
            id="navbar-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            aria-label={t("search")}
            className="bg-accent hover:bg-accent-hover m-0.75 flex size-8.5 shrink-0 items-center justify-center rounded-full text-white"
          >
            <SearchArrowIcon />
          </button>
        </form>

        <div className="flex shrink-0 items-center gap-3.5">
          <LanguageSwitcher />

          <Link href="/wishlist" aria-label={t("wishlist")} className={ICON_BUTTON_CLASSES}>
            <HeartIcon />
          </Link>

          <Link href="/cart" aria-label={t("cart")} className={`relative ${ICON_BUTTON_CLASSES}`}>
            <CartIcon />
            {itemCount > 0 && (
              <span className="bg-accent absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>

          <Link
            href={user ? "/account" : "/login"}
            aria-label={t("account")}
            className={
              user
                ? "flex size-9.5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white"
                : ICON_BUTTON_CLASSES
            }
          >
            {user ? initials : <PersonIcon />}
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25c-.3 0-.6-.1-.83-.3C8.1 17.6 3.75 13.9 3.75 9.75 3.75 7.1 5.85 5 8.5 5c1.4 0 2.73.65 3.5 1.68C12.77 5.65 14.1 5 15.5 5c2.65 0 4.75 2.1 4.75 4.75 0 4.15-4.35 7.85-7.42 10.2-.23.2-.53.3-.83.3Z"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 8.25h11l.9 11a1.5 1.5 0 0 1-1.5 1.6H7.1a1.5 1.5 0 0 1-1.5-1.6l.9-11Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25v-2a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
