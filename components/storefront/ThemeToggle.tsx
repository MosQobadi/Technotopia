"use client";

import { useTranslations } from "next-intl";
import { applyTheme, readAppliedTheme } from "@/lib/storefront/theme";

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
      <MoonIcon />
      <SunIcon />
    </button>
  );
}

// Shown in the light theme: the moon is what clicking gets you, not where you are.
function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4.5 dark:hidden"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 14.4A8.25 8.25 0 0 1 9.6 3.75a8.25 8.25 0 1 0 10.65 10.65Z"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="hidden size-4.5 dark:block"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2.75v2M12 19.25v2M4.22 4.22l1.41 1.41M18.37 18.37l1.41 1.41M2.75 12h2M19.25 12h2M4.22 19.78l1.41-1.41M18.37 5.63l1.41-1.41"
      />
    </svg>
  );
}
