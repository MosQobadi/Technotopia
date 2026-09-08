import { prisma } from "@/lib/db";
import { Status } from "@/lib/generated/prisma/enums";
import { toDisplayPrice } from "@/lib/storefront/pricing";
import type { CartCatalogEntry } from "@/lib/storefront/cart";

const CART_PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  image: true,
  price: true,
  discountPercent: true,
  status: true,
  category: { select: { name: true } },
  inventory: { select: { stock: true } },
} as const;

/**
 * The catalog's current truth about the products a browser cart is holding.
 *
 * Deliberately not filtered to ACTIVE: a product that has been deactivated
 * since it went in the cart must come back marked unavailable, not silently
 * vanish — the difference is what lets the cart page explain itself. Only an id
 * the catalog has no row for at all returns nothing, and the reconciliation
 * rules treat that the same way.
 */
export async function getCartCatalogEntries(productIds: string[]): Promise<CartCatalogEntry[]> {
  if (productIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: CART_PRODUCT_SELECT,
  });

  return products.map((product) => {
    const { price, originalPrice, discountPercent } = toDisplayPrice(
      product.price,
      product.discountPercent,
    );
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      category: product.category.name,
      unitPrice: price,
      originalPrice,
      discountPercent,
      stock: product.inventory?.stock ?? 0,
      isAvailable: product.status === Status.ACTIVE,
    };
  });
}
