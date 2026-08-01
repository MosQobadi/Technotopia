import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifyToken, getCookieName } from "@/lib/auth";
import { getOrderForCustomer } from "@/server/order.service";
import { Button } from "@/components/storefront/ui/Button";
import { formatPrice } from "@/lib/format";

const ESTIMATED_DELIVERY = "3–5 business days";

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

  const orderNumber = `#${order.id.slice(-8).toUpperCase()}`;

  return (
    <main className="mx-auto max-w-160 px-6 py-24 text-center">
      <div className="bg-success/12 mx-auto mb-6 flex size-16 items-center justify-center rounded-full">
        <span className="bg-success size-3.5 rounded-full" aria-hidden />
      </div>

      <h1 className="mb-3 text-[30px] font-extrabold tracking-tight text-ink-900">
        Order confirmed
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-gray-500">
        Thanks — we&apos;ve received your order and will start preparing it right away. A
        confirmation has been sent to your account.
      </p>

      <div className="bg-surface-100 mb-8 rounded-[20px] p-7 text-left">
        <div className="mb-3 flex justify-between text-sm">
          <span className="text-gray-500">Order number</span>
          <span className="font-mono font-semibold text-ink-900">{orderNumber}</span>
        </div>
        <div className="mb-3 flex justify-between text-sm">
          <span className="text-gray-500">Estimated delivery</span>
          <span className="font-semibold text-ink-900">{ESTIMATED_DELIVERY}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total paid</span>
          <span className="font-extrabold text-ink-900">{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3.5">
        <Button variant="primary" href={`/orders/${order.id}/tracking`}>
          Track order
        </Button>
        <Button variant="secondary" href="/">
          Continue shopping
        </Button>
      </div>
    </main>
  );
}
