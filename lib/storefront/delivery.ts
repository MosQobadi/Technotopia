// How an order reaches the customer, named once. The checkout summary quotes it
// (through `cartTotals`), `createOrder` bills it, and the home page's trust
// strip prints it — so the figure a customer is shown is the figure charged.
//
// The design offers one method, a flat-rate courier, so this is a constant and
// not a choice the order request carries. A second method would be a field on
// the checkout schema and a column on Order, not another line here.

/** The flat-rate courier's charge, in rials. */
export const STANDARD_DELIVERY_COST = 800_000;

/** What delivery adds to goods worth `goodsTotal`: when nothing ships, nothing is charged. */
export function deliveryCost(goodsTotal: number): number {
  return goodsTotal > 0 ? STANDARD_DELIVERY_COST : 0;
}
