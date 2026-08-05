import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware Link/usePathname/useRouter/redirect, scoped to `routing`.
// usePathname() from here returns the pathname with any locale prefix
// already stripped, so components that branch on path prefixes (e.g.
// StorefrontChrome) don't need to special-case "/fa/...".
export const { Link, usePathname, useRouter, redirect, getPathname } = createNavigation(routing);
