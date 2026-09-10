"use client";

import { startTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/storefront/ui/Button";
import { StatePage } from "@/components/storefront/ui/StatePage";

// When a storefront page throws while rendering — in practice, the database not
// answering a server-rendered page. One boundary serves the whole storefront: it
// sits under this group's layout, so the header survives a failed page, and the
// search, the cart and the navigation stay on screen as ways forward too.
//
// The error itself is never shown. Its message is English, and in production it
// is a digest that means nothing to a customer; Next has already logged it on
// the server.
//
// "Try again" has to re-run the server render, not just this boundary: `reset`
// alone re-renders the client from the same failed payload. Refreshing fetches
// the page again, and resetting inside the same transition swaps the boundary
// out only once there is something to show. (Next 16.2's `unstable_retry` does
// exactly this; it is spelled out here rather than leaning on an unstable name.)
export default function StorefrontError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("states.error");
  const tCommon = useTranslations("common");
  const router = useRouter();

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <StatePage title={t("title")} message={t("message")}>
      <Button variant="primary" onClick={retry}>
        {t("retry")}
      </Button>
      <Button variant="secondary" href="/">
        {tCommon("goHome")}
      </Button>
    </StatePage>
  );
}
