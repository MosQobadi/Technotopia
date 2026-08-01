import { prisma } from "@/lib/db";

export const SHIPPING_FLAT_RATE = 800_000;

const CART_ITEM_INCLUDE = {
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

type CartItemWithProduct = Awaited<
  ReturnType<typeof prisma.cartItem.findMany<{ include: typeof CART_ITEM_INCLUDE }>>
>[number];

export interface CartItemView {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  category: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CartView {
  items: CartItemView[];
  subtotal: number;
  shipping: number;
  total: number;
}

function toItemView(item: CartItemWithProduct): CartItemView {
  const unitPrice = Math.round(item.product.price * (1 - item.product.discountPercent / 100));
  return {
    id: item.id,
    productId: item.productId,
    slug: item.product.slug,
    name: item.product.name,
    image: item.product.image,
    category: item.product.category.name,
    unitPrice,
    quantity: item.quantity,
    lineTotal: unitPrice * item.quantity,
  };
}

function buildCartView(items: CartItemView[]): CartView {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal > 0 ? SHIPPING_FLAT_RATE : 0;
  return { items, subtotal, shipping, total: subtotal + shipping };
}

async function getOrCreateCartId(userId: string): Promise<string> {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });
  return cart.id;
}

export async function getCart(userId: string): Promise<CartView> {
  const cartId = await getOrCreateCartId(userId);
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: CART_ITEM_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return buildCartView(items.map(toItemView));
}

export type AddCartItemResult = { ok: true; cart: CartView } | { ok: false; reason: "product_not_found" };

export async function addCartItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<AddCartItemResult> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    return { ok: false, reason: "product_not_found" };
  }

  const cartId = await getOrCreateCartId(userId);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity },
    update: { quantity: { increment: quantity } },
  });

  return { ok: true, cart: await getCart(userId) };
}

export type CartItemMutationResult = { ok: true; cart: CartView } | { ok: false; reason: "not_found" };

async function findOwnedCartItem(userId: string, itemId: string) {
  return prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    select: { id: true },
  });
}

export async function updateCartItemQuantity(
  userId: string,
  itemId: string,
  quantity: number,
): Promise<CartItemMutationResult> {
  const item = await findOwnedCartItem(userId, itemId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return { ok: true, cart: await getCart(userId) };
}

export async function removeCartItem(userId: string, itemId: string): Promise<CartItemMutationResult> {
  const item = await findOwnedCartItem(userId, itemId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  return { ok: true, cart: await getCart(userId) };
}
