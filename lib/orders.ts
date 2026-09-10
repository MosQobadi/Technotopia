import { OrderStatus } from "@/lib/generated/prisma/enums";

// An order's progress as a row of steps. The customer's tracking page and the
// admin's order screen both draw it, and the admin's "Next Step" button walks
// it. Which moves the server accepts is `VALID_STATUS_TRANSITIONS` in
// server/order.service.ts; this is the forward path through them, which is all
// a step row shows. Cancelled is not a step — an order leaves the row there.

export const ORDER_STEPS: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.SENDING,
  OrderStatus.SENT,
  OrderStatus.DELIVERED,
];

/** How far along the row an order is: every step up to this index is done. -1 when cancelled. */
export function orderStepIndex(status: string): number {
  return ORDER_STEPS.findIndex((step) => step === status);
}

/** The step an order moves to next, or null once it is delivered or cancelled. */
export function nextOrderStep(status: string): OrderStatus | null {
  const index = orderStepIndex(status);
  return index === -1 ? null : (ORDER_STEPS[index + 1] ?? null);
}
