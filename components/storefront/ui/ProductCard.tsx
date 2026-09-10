import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { WishlistHeart } from "@/lib/store/wishlist";
import { CloseIcon, HeartIcon } from "@/components/storefront/icons";
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
  /** The discount the admin set. 0 when the product is not discounted. */
  discountPercent: number;
  imageSrc?: string;
  badge?: ProductCardBadge;
  /** The heart, from useWishlistHeart. Cards on the wishlist page pass `onRemove` instead. */
  wishlist?: WishlistHeart;
  onRemove?: () => void;
  onAddToCart?: () => void;
}

function badgeClasses(badge: ProductCardBadge): string {
  if (badge.kind === "discount") return "bg-danger-solid text-danger-foreground";
  if (badge.kind === "rank") return "bg-surface text-fg";
  return badge.tone === "error" ? "bg-surface text-danger" : "bg-surface text-warning";
}

export function ProductCard({
  href,
  category,
  name,
  price,
  originalPrice,
  discountPercent,
  imageSrc,
  badge,
  wishlist,
  onRemove,
  onAddToCart,
}: ProductCardProps) {
  const t = useTranslations("common");

  return (
    <div className="bg-surface-sunken group overflow-hidden rounded-[20px] transition-transform duration-150 hover:-translate-y-1">
      {/* Product photography is shot on white, so a photograph gets a white
          panel and is contained rather than cropped: the whole product is on
          screen, and a grid reads as one shelf instead of a patchwork. The
          panel stays white in the dark theme too (see --app-photo) — on any
          other ground a contained shot's empty bands show as a pasted-in
          rectangle. With no photograph there is nothing to match, so the
          placeholder keeps the card's own well, which flips. */}
      <div className={cn("relative aspect-square", imageSrc ? "bg-photo" : "bg-surface-muted")}>
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            className="object-contain p-4"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[10px] text-fg-subtle">
            PRODUCT PHOTO
          </div>
        )}
        {badge && (
          <span
            className={cn(
              "absolute start-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold",
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
            iconTone="surface"
            aria-label={t("removeFromWishlist")}
            onClick={onRemove}
            className="text-danger absolute end-2.5 top-2.5"
          >
            <CloseIcon className="size-4" />
          </Button>
        ) : (
          wishlist && (
            <Button
              variant="icon-circle"
              iconSize="sm"
              iconTone="surface"
              aria-label={wishlist.label}
              onClick={wishlist.toggle}
              className="hover:text-danger absolute end-2.5 top-2.5"
            >
              <HeartIcon className="size-4" fill={wishlist.isWishlisted ? "currentColor" : "none"} />
            </Button>
          )
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-5">
        <span className="text-accent-readable text-label">{category}</span>
        <Link href={href} className="text-fg text-subhead">
          {name}
        </Link>
        <PriceTag
          price={price}
          originalPrice={originalPrice}
          discountPercent={discountPercent}
          size="sm"
          className="mb-1"
        />
        <Button variant="primary" fullWidth onClick={onAddToCart}>
          {t("addToCart")}
        </Button>
      </div>
    </div>
  );
}
