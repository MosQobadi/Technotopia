"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/storefront/ui/Button";
import { StatePage } from "@/components/storefront/ui/StatePage";

// An order id that isn't in the signed-in customer's account. It says the same
// thing whether the order belongs to someone else or doesn't exist at all, so
// walking ids tells nobody which ones are real. The way forward is the
// customer's own order history. A client component for the reason given in
// ../../not-found.tsx.
export default function OrderNotFound() {
  const t = useTranslations("states.orderNotFound");
  const tCommon = useTranslations("common");

  return (
    <StatePage title={t("title")} message={t("message")}>
      <Button variant="primary" href="/account">
        {t("account")}
      </Button>
      <Button variant="secondary" href="/products">
        {tCommon("browseProducts")}
      </Button>
    </StatePage>
  );
}
