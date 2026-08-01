import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { Status } from "@/lib/generated/prisma/enums";
import type { InventoryStatus } from "@/types/inventory";
import type { StorefrontProductView } from "@/types/product";
import type { StorefrontProductSort } from "@/lib/validation";
import { deriveInventoryStatus, stockStatusWhere } from "./inventory.service";

export const STOREFRONT_PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  image: true,
  price: true,
  discountPercent: true,
  createdAt: true,
  category: { select: { name: true } },
  brand: { select: { name: true } },
  inventory: { select: { stock: true } },
} as const;

type StorefrontProductRow = Awaited<
  ReturnType<typeof prisma.product.findMany<{ select: typeof STOREFRONT_PRODUCT_SELECT }>>
>[number];

export function toStorefrontProductView(product: StorefrontProductRow): StorefrontProductView {
  const hasDiscount = product.discountPercent > 0;
  const price = hasDiscount
    ? Math.round(product.price * (1 - product.discountPercent / 100))
    : product.price;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image,
    category: product.category.name,
    brand: product.brand.name,
    price,
    originalPrice: hasDiscount ? product.price : undefined,
    createdAt: product.createdAt.toISOString(),
    stockStatus: deriveInventoryStatus(product.inventory?.stock ?? 0),
  };
}

export interface ListStorefrontProductsParams {
  search?: string;
  categoryId?: string;
  brandId?: string;
  maxPrice?: number;
  stockStatus?: InventoryStatus;
  sort: StorefrontProductSort;
  page: number;
  pageSize: number;
}

export interface ListStorefrontProductsResult {
  products: StorefrontProductView[];
  total: number;
}

const ORDER_BY_SORT: Record<StorefrontProductSort, Prisma.ProductOrderByWithRelationInput> = {
  sold: { salesCount: "desc" },
  priceAsc: { price: "asc" },
  priceDesc: { price: "desc" },
  new: { createdAt: "desc" },
};

export async function listStorefrontProducts({
  search,
  categoryId,
  brandId,
  maxPrice,
  stockStatus,
  sort,
  page,
  pageSize,
}: ListStorefrontProductsParams): Promise<ListStorefrontProductsResult> {
  const where: Prisma.ProductWhereInput = {
    status: Status.ACTIVE,
    ...(categoryId ? { categoryId } : {}),
    ...(brandId ? { brandId } : {}),
    ...(maxPrice !== undefined ? { price: { lte: maxPrice } } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(stockStatus ? stockStatusWhere(stockStatus) : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: STOREFRONT_PRODUCT_SELECT,
      orderBy: ORDER_BY_SORT[sort],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { products: products.map(toStorefrontProductView), total };
}
