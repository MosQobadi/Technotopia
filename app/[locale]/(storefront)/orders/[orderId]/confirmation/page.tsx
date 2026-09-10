import { notFound } from "next/navigation";
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
  if (!payload) notFound();

  const order = await getOrderForCustomer(orderId, payload.userId);
  if (!order) notFound();

  return <OrderReceipt orderId={order.id} total={order.total} isGuest={false} />;
}
