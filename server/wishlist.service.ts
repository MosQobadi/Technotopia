import { prisma } from "@/lib/db";

const WISHLIST_ITEM_INCLUDE = {
  product: {
    select: {
      id: true,
      slug: true,
      name: true,
      image: true,
      price: true,
      discountPercent: true,
      category: { select: { name: true } },
    },
  },
} as const;

type WishlistItemWithProduct = Awaited<
  ReturnType<typeof prisma.wishlist.findMany<{ include: typeof WISHLIST_ITEM_INCLUDE }>>
>[number];

export interface WishlistItemView {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  category: string;
  price: number;
  originalPrice?: number;
}

function toItemView(item: WishlistItemWithProduct): WishlistItemView {
  const hasDiscount = item.product.discountPercent > 0;
  const price = hasDiscount
    ? Math.round(item.product.price * (1 - item.product.discountPercent / 100))
    : item.product.price;
  return {
    id: item.id,
    productId: item.productId,
    slug: item.product.slug,
    name: item.product.name,
    image: item.product.image,
    category: item.product.category.name,
    price,
    originalPrice: hasDiscount ? item.product.price : undefined,
  };
}

export async function getWishlist(userId: string): Promise<WishlistItemView[]> {
  const items = await prisma.wishlist.findMany({
    where: { userId },
    include: WISHLIST_ITEM_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return items.map(toItemView);
}

export type AddWishlistItemResult =
  | { ok: true; items: WishlistItemView[] }
  | { ok: false; reason: "product_not_found" };

export async function addWishlistItem(userId: string, productId: string): Promise<AddWishlistItemResult> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    return { ok: false, reason: "product_not_found" };
  }

  await prisma.wishlist.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  });

  return { ok: true, items: await getWishlist(userId) };
}

export type RemoveWishlistItemResult =
  | { ok: true; items: WishlistItemView[] }
  | { ok: false; reason: "not_found" };

export async function removeWishlistItem(userId: string, productId: string): Promise<RemoveWishlistItemResult> {
  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  await prisma.wishlist.delete({ where: { id: existing.id } });
  return { ok: true, items: await getWishlist(userId) };
}
