"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

// A real <a href> to the same page in the other locale (via next-intl's Link
// `locale` override) — crawlable server-rendered navigation, not a JS-only
// toggle, so search engines can discover both language versions of a page.
export function LanguageSwitcher() {
  return (
    // useSearchParams() opts a subtree out of static rendering unless
    // wrapped in Suspense — scoped here so pages using this in their chrome
    // (Navbar/MinimalHeader) stay statically prerenderable.
    <Suspense fallback={<LanguageSwitcherFallback />}>
      <LanguageSwitcherLink />
    </Suspense>
  );
}

function LanguageSwitcherLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("nav");

  const targetLocale = locale === "fa" ? "en" : "fa";
  const query = searchParams.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <Link
      href={href}
      locale={targetLocale}
      aria-label={targetLocale === "fa" ? t("switchToFarsi") : t("switchToEnglish")}
      className="flex h-9.5 shrink-0 items-center justify-center rounded-full bg-gray-100 px-3.5 text-xs font-bold text-gray-900 hover:bg-gray-200"
    >
      {targetLocale === "fa" ? "فا" : "EN"}
    </Link>
  );
}

function LanguageSwitcherFallback() {
  return (
    <span
      aria-hidden
      className="flex h-9.5 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100"
    />
  );
}
