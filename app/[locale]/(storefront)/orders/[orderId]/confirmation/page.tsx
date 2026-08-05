import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { verifyToken, getCookieName } from "@/lib/auth";
import { getOrderForCustomer } from "@/server/order.service";
import { Button } from "@/components/storefront/ui/Button";
import { formatPrice } from "@/lib/format";

interface OrderConfirmationPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { orderId } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) notFound();

  const order = await getOrderForCustomer(orderId, payload.userId);
  if (!order) notFound();

  const t = await getTranslations("orders.confirmation");
  const orderNumber = `#${order.id.slice(-8).toUpperCase()}`;

  return (
    <main className="mx-auto max-w-160 px-6 py-24 text-center">
      <div className="bg-success/12 mx-auto mb-6 flex size-16 items-center justify-center rounded-full">
        <span className="bg-success size-3.5 rounded-full" aria-hidden />
      </div>

      <h1 className="text-ink-900 mb-3 text-[30px] font-extrabold tracking-tight">
        {t("heading")}
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-gray-500">{t("message")}</p>

      <div className="bg-surface-100 mb-8 rounded-[20px] p-7 text-start">
        <div className="mb-3 flex justify-between text-sm">
          <span className="text-gray-500">{t("orderNumber")}</span>
          <span className="text-ink-900 font-mono font-semibold">{orderNumber}</span>
        </div>
        <div className="mb-3 flex justify-between text-sm">
          <span className="text-gray-500">{t("estimatedDelivery")}</span>
          <span className="text-ink-900 font-semibold">{t("estimatedDeliveryValue")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("totalPaid")}</span>
          <span className="text-ink-900 font-extrabold">{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3.5">
        <Button variant="primary" href={`/orders/${order.id}/tracking`}>
          {t("trackOrder")}
        </Button>
        <Button variant="secondary" href="/">
          {t("continueShopping")}
        </Button>
      </div>
    </main>
  );
}
