const rialFormatter = new Intl.NumberFormat("fa-IR");

export function formatPrice(amountInRial: number): string {
  return `${rialFormatter.format(amountInRial)} ریال`;
}
