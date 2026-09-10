import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSessionPayload } from "@/lib/auth/session";
import { getOrderForCustomer } from "@/server/order.service";
import { OrderReceipt } from "@/components/storefront/checkout/OrderReceipt";

// A signed-in customer's receipt, read back from the database and scoped to
// them. A guest's is /checkout/confirmation, which renders the POST's response.

interface OrderConfirmationPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { orderId } = await params;

  const payload = await getSessionPayload();
  // Signed out: log in and come back. Someone else's order: the 404 in
  // orders/[orderId]/not-found.tsx, same as tracking.
  if (!payload) {
    return redirect({
      href: {
        pathname: "/login",
        query: { next: `/orders/${encodeURIComponent(orderId)}/confirmation` },
      },
      locale: await getLocale(),
    });
  }

  const order = await getOrderForCustomer(orderId, payload.userId);
  if (!order) notFound();

  return <OrderReceipt orderId={order.id} total={order.total} isGuest={false} />;
}
