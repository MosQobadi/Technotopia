import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
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

/** 0 = Out of Stock, 1-9 = Low Stock, 10+ = In Stock — see Prisma's `Inventory` model comment. */
export function deriveInventoryStatus(stock: number): InventoryStatus {
  if (stock === 0) return "OUT_OF_STOCK";
  if (stock < 10) return "LOW_STOCK";
  return "IN_STOCK";
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
  LOW_STOCK: { gt: 0, lt: 10 },
  IN_STOCK: { gte: 10 },
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
  | { ok: true; item: InventoryListItem }
  | { ok: false; reason: "not_found" };

export async function addStock(productId: string, amount: number): Promise<AddStockResult> {
  try {
    const inventory = await prisma.inventory.update({
      where: { productId },
      data: { stock: { increment: amount }, lastUpdatedAt: new Date() },
      include: { product: { include: PRODUCT_RELATIONS_INCLUDE } },
    });

    return { ok: true, item: toListItem({ ...inventory.product, inventory }) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}
