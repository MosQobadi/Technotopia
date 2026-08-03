import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { PriceTag } from "./PriceTag";

type ProductCardBadge =
  | { kind: "discount"; label: string }
  | { kind: "status"; label: string; tone: "warning" | "error" }
  | { kind: "rank"; label: string };

interface ProductCardProps {
  href: string;
  category: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageSrc?: string;
  badge?: ProductCardBadge;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
  onRemove?: () => void;
  onAddToCart?: () => void;
}

function badgeClasses(badge: ProductCardBadge): string {
  if (badge.kind === "discount") return "bg-error text-white";
  if (badge.kind === "rank") return "bg-white text-ink-900";
  return badge.tone === "error" ? "bg-white text-error" : "bg-white text-warning";
}

export function ProductCard({
  href,
  category,
  name,
  price,
  originalPrice,
  imageSrc,
  badge,
  isWishlisted,
  onToggleWishlist,
  onRemove,
  onAddToCart,
}: ProductCardProps) {
  return (
    <div className="bg-surface-100 group overflow-hidden rounded-[20px] transition-transform duration-150 hover:-translate-y-1">
      <div className="bg-surface-200 relative aspect-square">
        {imageSrc ? (
          <Image src={imageSrc} alt={name} fill className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center font-mono text-[10px] text-gray-500">
            PRODUCT PHOTO
          </div>
        )}
        {badge && (
          <span
            className={cn(
              "absolute top-3 left-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold",
              badgeClasses(badge),
            )}
          >
            {badge.label}
          </span>
        )}
        {onRemove ? (
          <Button
            variant="icon-circle"
            iconSize="sm"
            iconTone="white"
            aria-label="Remove from wishlist"
            onClick={onRemove}
            className="absolute top-2.5 right-2.5 text-error"
          >
            ✕
          </Button>
        ) : (
          <Button
            variant="icon-circle"
            iconSize="sm"
            iconTone="white"
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            onClick={onToggleWishlist}
            className="absolute top-2.5 right-2.5 hover:text-error"
          >
            {isWishlisted ? "♥" : "♡"}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-5">
        <span className="text-accent font-mono text-[11px] tracking-wide uppercase">{category}</span>
        <Link href={href} className="text-[17px] font-bold tracking-tight text-ink-900">
          {name}
        </Link>
        <PriceTag price={price} originalPrice={originalPrice} size="sm" className="mb-1" />
        <Button variant="primary" fullWidth onClick={onAddToCart}>
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
