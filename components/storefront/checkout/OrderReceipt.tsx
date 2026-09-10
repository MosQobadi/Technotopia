import { useTranslations } from "next-intl";
import { Button } from "@/components/storefront/ui/Button";
import { formatOrderNumber, formatPrice } from "@/lib/format";

// The receipt, as both confirmation screens show it: a signed-in customer's read
// back from the database, a guest's from the order POST's own response. The one
// difference is where the customer can go next. An account has a tracking page
// for the order; a guest has nothing to open one with, so a guest is told to keep
// the number instead of being offered a link that would 404.

interface OrderReceiptProps {
  orderId: string;
  total: number;
  isGuest: boolean;
}

export function OrderReceipt({ orderId, total, isGuest }: OrderReceiptProps) {
  const t = useTranslations("orders.confirmation");

  return (
    <main className="mx-auto max-w-160 px-6 py-24 text-center">
      <div className="bg-success/12 mx-auto mb-6 flex size-16 items-center justify-center rounded-full">
        <span className="bg-success size-3.5 rounded-full" aria-hidden />
      </div>

      <h1 className="text-fg text-title mb-3">{t("heading")}</h1>
      <p className="mb-8 text-[15px] leading-relaxed text-fg-subtle">
        {isGuest ? t("guestMessage") : t("message")}
      </p>

      <div className="bg-surface-sunken mb-8 rounded-[20px] p-7 text-start">
        <div className="mb-3 flex justify-between text-sm">
          <span className="text-fg-subtle">{t("orderNumber")}</span>
          <span className="text-fg font-mono font-semibold">{formatOrderNumber(orderId)}</span>
        </div>
        <div className="mb-3 flex justify-between text-sm">
          <span className="text-fg-subtle">{t("estimatedDelivery")}</span>
          <span className="text-fg font-semibold">{t("estimatedDeliveryValue")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-fg-subtle">{t("totalPaid")}</span>
          <span className="text-fg font-extrabold">{formatPrice(total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3.5">
        {!isGuest && (
          <Button variant="primary" href={`/orders/${orderId}/tracking`}>
            {t("trackOrder")}
          </Button>
        )}
        <Button variant={isGuest ? "primary" : "secondary"} href="/">
          {t("continueShopping")}
        </Button>
      </div>
    </main>
  );
}
