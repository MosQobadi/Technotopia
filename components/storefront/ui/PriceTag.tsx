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
  /** Shows the mono "IN STOCK" status next to the price. Hidden when a discount is shown. */
  inStock?: boolean;
  size?: PriceTagSize;
  className?: string;
}

export function PriceTag({ price, originalPrice, inStock, size = "md", className }: PriceTagProps) {
  const hasDiscount = originalPrice != null && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : null;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("font-extrabold text-ink-900", PRICE_SIZE_CLASSES[size])}>
        {formatPrice(price)}
      </span>
      {hasDiscount && (
        <>
          <span className="font-mono text-sm text-gray-500 line-through">
            {formatPrice(originalPrice)}
          </span>
          <span className="rounded-full bg-error px-2.5 py-0.5 font-mono text-xs font-bold text-white">
            -{discountPercent}%
          </span>
        </>
      )}
      {inStock && !hasDiscount && (
        <span className="font-mono text-xs text-success">IN STOCK</span>
      )}
    </div>
  );
}
