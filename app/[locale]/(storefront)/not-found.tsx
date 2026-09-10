"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/storefront/ui/Button";
import { StatePage } from "@/components/storefront/ui/StatePage";

// Every storefront 404 with nothing more specific to say: an address no route
// claims (see [...rest]/page.tsx), or a notFound() from a page without a
// not-found.tsx of its own. Without this file Next answers with its own page —
// in English on /fa, outside the storefront's header, with no way back in.
//
// A client component for the same reason as components/storefront/ui/Skeleton:
// rendered on the server, a not-found element can run before the locale layout
// has called setRequestLocale, and next-intl's fallback to the request headers
// failed the whole 404 render. The client provider already has the messages.
export default function NotFound() {
  const t = useTranslations("states.notFound");
  const tCommon = useTranslations("common");

  return (
    <StatePage title={t("title")} message={t("message")}>
      <Button variant="primary" href="/products">
        {tCommon("browseProducts")}
      </Button>
      <Button variant="secondary" href="/">
        {tCommon("goHome")}
      </Button>
    </StatePage>
  );
}
