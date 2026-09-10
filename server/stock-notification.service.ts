import { prisma } from "@/lib/db";
import { Status } from "@/lib/generated/prisma/enums";

export type RequestRestockResult =
  | { ok: true; alreadyInStock: boolean }
  | { ok: false; reason: "not_found" };

/**
 * A back-in-stock request from the PDP. Recorded only while the product is out
 * of stock: a page can be a few minutes older than the shelf, and a customer who
 * asks about something already back is told so in the answer — writing the row
 * as well would put them on the admin's list to be told a second time.
 */
export async function requestRestockNotification(
  slug: string,
  contact: string,
): Promise<RequestRestockResult> {
  const product = await prisma.product.findFirst({
    where: { slug, status: Status.ACTIVE },
    select: { id: true, inventory: { select: { stock: true } } },
  });
  if (!product) return { ok: false, reason: "not_found" };

  if ((product.inventory?.stock ?? 0) > 0) return { ok: true, alreadyInStock: true };

  // Asking again while the first request is still waiting is the same request.
  const pending = await prisma.stockNotification.findFirst({
    where: { productId: product.id, contact, notifiedAt: null },
    select: { id: true },
  });
  if (!pending) {
    await prisma.stockNotification.create({ data: { productId: product.id, contact } });
  }

  return { ok: true, alreadyInStock: false };
}

export interface PendingStockNotification {
  id: string;
  contact: string;
  createdAt: Date;
}

/** Everyone still waiting on this product, oldest first — the order to reach them in. */
export async function listPendingStockNotifications(
  productId: string,
): Promise<PendingStockNotification[]> {
  return prisma.stockNotification.findMany({
    where: { productId, notifiedAt: null },
    select: { id: true, contact: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Stamps the requests the admin was shown and has reached. Scoped to the product
 * and to rows still pending, so an id from another product's list, or one
 * already stamped, is left alone. Returns how many were stamped.
 */
export async function markStockNotificationsNotified(
  productId: string,
  ids: string[],
): Promise<number> {
  const { count } = await prisma.stockNotification.updateMany({
    where: { productId, id: { in: ids }, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });
  return count;
}
