const rialFormatter = new Intl.NumberFormat("fa-IR");

export function formatPrice(amountInRial: number): string {
  return `${rialFormatter.format(amountInRial)} ریال`;
}

/** An order as a customer reads it out: the last eight characters of its id. */
export function formatOrderNumber(orderId: string): string {
  return `#${orderId.slice(-8).toUpperCase()}`;
}
