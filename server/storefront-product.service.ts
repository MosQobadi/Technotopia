import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { Status } from "@/lib/generated/prisma/enums";
import type { InventoryStatus } from "@/types/inventory";
import type {
  StorefrontProductDetail,
  StorefrontProductDetailResult,
  StorefrontProductView,
} from "@/types/product";
import type { StorefrontProductSort } from "@/lib/validation";
import { toDisplayPrice } from "@/lib/storefront/pricing";
import { deriveInventoryStatus, stockStatusWhere } from "./inventory.service";

const RELATED_PRODUCT_LIMIT = 4;

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
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image,
    category: product.category.name,
    brand: product.brand.name,
    ...toDisplayPrice(product.price, product.discountPercent),
    createdAt: product.createdAt.toISOString(),
    stockStatus: deriveInventoryStatus(product.inventory?.stock ?? 0),
  };
}

export interface ListStorefrontProductsParams {
  search?: string;
  categoryId?: string;
  /** Any of these brands, not all of them — the PLP's brand filter is multi-select. */
  brandIds?: string[];
  maxPrice?: number;
  /** Same "any of these" rule as `brandIds`. */
  stockStatuses?: InventoryStatus[];
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
  brandIds,
  maxPrice,
  stockStatuses,
  sort,
  page,
  pageSize,
}: ListStorefrontProductsParams): Promise<ListStorefrontProductsResult> {
  const where: Prisma.ProductWhereInput = {
    status: Status.ACTIVE,
    ...(categoryId ? { categoryId } : {}),
    ...(brandIds?.length ? { brandId: { in: brandIds } } : {}),
    ...(maxPrice !== undefined ? { price: { lte: maxPrice } } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    // Each status is its own stock predicate, so several of them is an OR
    // rather than an impossible AND across the same column.
    ...(stockStatuses?.length ? { OR: stockStatuses.map(stockStatusWhere) } : {}),
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

const STOREFRONT_PRODUCT_DETAIL_SELECT = {
  ...STOREFRONT_PRODUCT_SELECT,
  categoryId: true,
  tags: true,
  shortDescription: true,
  longDescription: true,
} as const;

type StorefrontProductDetailRow = NonNullable<
  Awaited<
    ReturnType<typeof prisma.product.findFirst<{ select: typeof STOREFRONT_PRODUCT_DETAIL_SELECT }>>
  >
>;

function toStorefrontProductDetail(product: StorefrontProductDetailRow): StorefrontProductDetail {
  return {
    ...toStorefrontProductView(product),
    tags: product.tags,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
  };
}

export interface ProductSitemapEntry {
  slug: string;
  updatedAt: Date;
}

export async function listActiveProductSlugs(): Promise<ProductSitemapEntry[]> {
  return prisma.product.findMany({
    where: { status: Status.ACTIVE },
    select: { slug: true, updatedAt: true },
  });
}

export async function getStorefrontProductBySlug(
  slug: string,
): Promise<StorefrontProductDetailResult | null> {
  const product = await prisma.product.findFirst({
    where: { slug, status: Status.ACTIVE },
    select: STOREFRONT_PRODUCT_DETAIL_SELECT,
  });
  if (!product) return null;

  const related = await prisma.product.findMany({
    where: {
      status: Status.ACTIVE,
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    select: STOREFRONT_PRODUCT_SELECT,
    orderBy: { createdAt: "desc" },
    take: RELATED_PRODUCT_LIMIT,
  });

  return {
    product: toStorefrontProductDetail(product),
    related: related.map(toStorefrontProductView),
  };
}
