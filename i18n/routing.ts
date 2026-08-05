import { defineRouting } from "next-intl/routing";

// English stays unprefixed at "/", Farsi is prefixed under "/fa" —
// "as-needed" gives us that split without listing every route.
// localeDetection is off on purpose: "/" must always resolve to English
// (deterministic for SEO crawlers and the existing Playwright specs), not
// silently redirected based on a visitor's Accept-Language header. Users
// switch languages explicitly via LanguageSwitcher instead.
export const routing = defineRouting({
  locales: ["en", "fa"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
