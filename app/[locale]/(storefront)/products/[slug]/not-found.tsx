"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/storefront/ui/Button";
import { StatePage } from "@/components/storefront/ui/StatePage";

// A product slug that doesn't resolve: never existed, or the product was
// deactivated. Either way the customer came for gear, so the catalog is the
// first way out. A client component for the reason given in ../../not-found.tsx.
export default function ProductNotFound() {
  const t = useTranslations("states.productNotFound");
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
