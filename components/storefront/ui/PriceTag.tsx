import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

type PriceTagSize = "sm" | "md" | "lg";

const PRICE_SIZE_CLASSES: Record<PriceTagSize, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

interface PriceTagProps {
  price: number;
  originalPrice?: number;
  /**
   * The discount the admin set, straight from the product — 0 when there isn't
   * one. Required rather than worked out here from the two prices: the sale
   * price is rounded to a whole rial, so inverting it can report a point less
   * than was actually set (see `toDisplayPrice`).
   */
  discountPercent: number;
  /** Shows the "IN STOCK" status next to the price. Hidden when a discount is shown. */
  inStock?: boolean;
  size?: PriceTagSize;
  className?: string;
}

export function PriceTag({
  price,
  originalPrice,
  discountPercent,
  inStock,
  size = "md",
  className,
}: PriceTagProps) {
  const hasDiscount = discountPercent > 0 && originalPrice != null;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("text-fg font-extrabold", PRICE_SIZE_CLASSES[size])}>
        {formatPrice(price)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-fg-subtle line-through">{formatPrice(originalPrice)}</span>
          <span className="bg-danger-solid rounded-full px-2.5 py-0.5 text-xs font-bold text-danger-foreground">
            -{discountPercent}%
          </span>
        </>
      )}
      {inStock && !hasDiscount && <span className="text-success text-xs">IN STOCK</span>}
    </div>
  );
}
