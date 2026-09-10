"use client";

import { useTranslations } from "next-intl";
import { applyTheme, readAppliedTheme } from "@/lib/storefront/theme";
import { MoonIcon, SunIcon } from "./icons";

// Deliberately stateless. The theme lives in one attribute on <html>, and the
// `dark:` variant in globals.css keys on that attribute — so flipping it
// repaints the whole page in CSS, without React re-rendering anything. Holding
// the theme in React state as well would mean two copies of the same fact, and
// the copy React holds is the one that cannot survive a locale switch (see
// lib/storefront/theme.ts).
//
// Which icon shows is CSS too, for the same reason plus one more: a value read
// from localStorage during render is a value the server could not have rendered,
// which is a hydration mismatch. Both icons are always in the markup and the
// theme decides which one has a box, so the first paint is already correct — the
// inline script in the layout has set the attribute before this ever renders.
//
// The label stays "Toggle dark mode" in both states rather than naming the
// state, because the state it would name is set outside React: a label rendered
// from `readAppliedTheme()` would be stale on the server and wrong until an
// effect fixed it, which is exactly the flash the CSS approach avoids.
export function ThemeToggle() {
  const t = useTranslations("nav");

  return (
    <button
      type="button"
      aria-label={t("toggleTheme")}
      onClick={() => applyTheme(readAppliedTheme() === "dark" ? "light" : "dark")}
      className="bg-surface-sunken text-fg hover:bg-surface-muted focus-visible:outline-accent-readable flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {/* The moon shows in the light theme: it is what clicking gets you, not
          where you are. */}
      <MoonIcon className="size-4.5 dark:hidden" />
      <SunIcon className="hidden size-4.5 dark:block" />
    </button>
  );
}
