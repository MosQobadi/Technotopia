import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// /admin and /api are routed before next-intl's locale middleware (see
// proxy.ts) and never get a "/fa" prefix, so they're listed once. The rest
// are storefront routes reachable under both "/path" and "/fa/path" —
// robots.txt "disallow" rules are left-anchored, not hierarchical, so each
// needs its own entry.
const UNLOCALIZED_DISALLOWED_PATHS = ["/admin", "/api"];
const LOCALIZED_DISALLOWED_PATHS = [
  "/cart",
  "/checkout",
  "/account",
  "/dev-preview",
  "/storefront-dev-preview",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...UNLOCALIZED_DISALLOWED_PATHS,
        ...LOCALIZED_DISALLOWED_PATHS.flatMap((path) => [path, `/fa${path}`]),
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
