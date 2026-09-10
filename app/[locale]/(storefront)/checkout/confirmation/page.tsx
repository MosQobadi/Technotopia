import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuestReceiptContent } from "./GuestReceiptContent";

// A guest's receipt. There is no order id in the path because there is nothing
// here to look up: a guest order has no owner to check a request against, so the
// page shows the receipt the order POST handed back (lib/store/receipt). A
// signed-in customer's is /orders/[orderId]/confirmation, read from the database.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders.confirmation");
  return { title: t("heading"), robots: { index: false, follow: false } };
}

export default function GuestReceiptPage() {
  return <GuestReceiptContent />;
}
