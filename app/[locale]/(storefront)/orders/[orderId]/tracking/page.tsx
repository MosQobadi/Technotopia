import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import { verifyToken, getCookieName } from "@/lib/auth";
import { getOrderForCustomer } from "@/server/order.service";
import { OrderStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/cn";

interface OrderTrackingPageProps {
  params: Promise<{ orderId: string }>;
}

const STEP_ORDER: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.SENDING,
  OrderStatus.SENT,
  OrderStatus.DELIVERED,
];

function formatTimestamp(date: Date): string {
  return format(date, "MMM d, yyyy · HH:mm");
}

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { orderId } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) notFound();

  const order = await getOrderForCustomer(orderId, payload.userId);
  if (!order) notFound();

  const t = await getTranslations("orders.tracking");
  const tStatus = await getTranslations("common.orderStatus");

  const orderNumber = `#${order.id.slice(-8).toUpperCase()}`;
  const isCancelled = order.status === OrderStatus.CANCELLED;
  const currentStepIndex = isCancelled ? -1 : STEP_ORDER.indexOf(order.status);

  const history = [
    { label: t("orderPlaced"), timestamp: order.createdAt },
    ...(order.status !== OrderStatus.PENDING
      ? [
          {
            label: t("statusUpdated", { status: tStatus(order.status) }),
            timestamp: order.updatedAt,
          },
        ]
      : []),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <main className="mx-auto max-w-180 px-6 py-12">
      <h1 className="text-ink-900 text-title mb-2">{t("heading")}</h1>
      <p className="mb-8 text-[13px] text-gray-500">
        <span className="font-mono">{orderNumber}</span> ·{" "}
        {t("placed", { date: format(order.createdAt, "MMM d, yyyy") })}
      </p>

      <div className="bg-surface-100 mb-8 rounded-[20px] px-7 py-8">
        {isCancelled ? (
          <p className="text-ink-900 text-center text-sm font-semibold">{t("cancelled")}</p>
        ) : (
          <div className="flex items-start">
            {STEP_ORDER.map((step, index) => {
              const done = index <= currentStepIndex;
              return (
                <div key={step} className="relative flex flex-1 flex-col items-center">
                  {index > 0 && (
                    <div
                      className={cn(
                        // Percentage-offset connector between step dots — no clean
                        // logical-property equivalent, so it's flipped explicitly.
                        "absolute top-2.5 left-[-50%] h-0.5 w-full rtl:right-[-50%] rtl:left-auto",
                        done ? "bg-accent" : "bg-gray-200",
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "z-10 flex size-5.5 items-center justify-center rounded-full",
                      done ? "bg-accent" : "bg-gray-200",
                    )}
                  >
                    {done && <span className="text-xs font-extrabold text-white">✓</span>}
                  </div>
                  <span
                    className={cn(
                      "mt-3 text-center text-xs font-semibold",
                      done ? "text-ink-900" : "text-gray-400",
                    )}
                  >
                    {tStatus(step)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        {history.map((entry) => (
          <div
            key={`${entry.label}-${entry.timestamp.toISOString()}`}
            className="flex items-start gap-3.5"
          >
            <span className="bg-accent mt-1.5 size-2 shrink-0 rounded-full" aria-hidden />
            <div>
              <div className="text-ink-900 text-sm font-semibold">{entry.label}</div>
              <div className="text-xs text-gray-500">{formatTimestamp(entry.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
