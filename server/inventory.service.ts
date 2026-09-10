import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { deriveInventoryStatus, LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import type { InventoryStatus } from "@/types/inventory";

const PRODUCT_RELATIONS_INCLUDE = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
} as const;

const INVENTORY_INCLUDE = {
  ...PRODUCT_RELATIONS_INCLUDE,
  inventory: { select: { stock: true, lastUpdatedAt: true } },
} as const;

type ProductWithInventory = Prisma.ProductGetPayload<{ include: typeof INVENTORY_INCLUDE }>;

export interface InventoryListItem {
  productId: string;
  name: string;
  sku: string;
  category: { id: string; name: string };
  brand: { id: string; name: string };
  stock: number;
  status: InventoryStatus;
  lastUpdatedAt: Date | null;
}

function toListItem(product: ProductWithInventory): InventoryListItem {
  const stock = product.inventory?.stock ?? 0;
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    brand: product.brand,
    stock,
    status: deriveInventoryStatus(stock),
    lastUpdatedAt: product.inventory?.lastUpdatedAt ?? null,
  };
}

const STOCK_FILTER_BY_STATUS: Record<Exclude<InventoryStatus, "OUT_OF_STOCK">, Prisma.IntFilter> = {
  LOW_STOCK: { gt: 0, lt: LOW_STOCK_THRESHOLD },
  IN_STOCK: { gte: LOW_STOCK_THRESHOLD },
};

/** Prisma where-clause for a derived stock status — shared with the storefront listing. */
export function stockStatusWhere(status: InventoryStatus): Prisma.ProductWhereInput {
  if (status === "OUT_OF_STOCK") {
    return { OR: [{ inventory: null }, { inventory: { stock: 0 } }] };
  }
  return { inventory: { stock: STOCK_FILTER_BY_STATUS[status] } };
}

export interface ListInventoryParams {
  search?: string;
  categoryId?: string;
  brandId?: string;
  status?: InventoryStatus;
  page: number;
  pageSize: number;
}

export interface ListInventoryResult {
  items: InventoryListItem[];
  total: number;
}

export async function listInventory({
  search,
  categoryId,
  brandId,
  status,
  page,
  pageSize,
}: ListInventoryParams): Promise<ListInventoryResult> {
  const conditions: Prisma.ProductWhereInput[] = [];

  if (categoryId) conditions.push({ categoryId });
  if (brandId) conditions.push({ brandId });
  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (status) {
    conditions.push(stockStatusWhere(status));
  }

  const where: Prisma.ProductWhereInput = conditions.length ? { AND: conditions } : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: INVENTORY_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { items: products.map(toListItem), total };
}

export type AddStockResult =
  /** `slug` is for the route, which refreshes the cached product page. */
  | { ok: true; item: InventoryListItem; slug: string }
  | { ok: false; reason: "not_found" };

export async function addStock(productId: string, amount: number): Promise<AddStockResult> {
  try {
    const inventory = await prisma.inventory.update({
      where: { productId },
      data: { stock: { increment: amount }, lastUpdatedAt: new Date() },
      include: { product: { include: PRODUCT_RELATIONS_INCLUDE } },
    });

    return {
      ok: true,
      item: toListItem({ ...inventory.product, inventory }),
      slug: inventory.product.slug,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}
