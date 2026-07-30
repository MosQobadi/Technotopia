import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Product } from "@/lib/generated/prisma/client";
import { Status } from "@/lib/generated/prisma/enums";
import type { ProductCreateInput, ProductUpdateInput } from "@/lib/validation";

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  inventory: { select: { stock: true } },
} as const;

type ProductWithRelations = Product & {
  category: { id: string; name: string };
  brand: { id: string; name: string };
  inventory: { stock: number } | null;
};

export interface ProductListItem extends Product {
  finalPrice: number;
  stock: number;
  category: { id: string; name: string };
  brand: { id: string; name: string };
}

function toListItem(product: ProductWithRelations): ProductListItem {
  const { inventory, ...rest } = product;
  const finalPrice = Math.round(rest.price * (1 - rest.discountPercent / 100));

  return {
    ...rest,
    finalPrice,
    stock: inventory?.stock ?? 0,
  };
}

export interface ListProductsParams {
  search?: string;
  categoryId?: string;
  brandId?: string;
  status?: Status;
  page: number;
  pageSize: number;
}

export interface ListProductsResult {
  products: ProductListItem[];
  total: number;
}

export async function listProducts({
  search,
  categoryId,
  brandId,
  status,
  page,
  pageSize,
}: ListProductsParams): Promise<ListProductsResult> {
  const where: Prisma.ProductWhereInput = {
    ...(categoryId ? { categoryId } : {}),
    ...(brandId ? { brandId } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { products: products.map(toListItem), total };
}

export type CreateProductResult =
  | { ok: true; product: ProductListItem }
  | { ok: false; reason: "duplicate_sku" };

export async function createProduct(input: ProductCreateInput): Promise<CreateProductResult> {
  try {
    const product = await prisma.product.create({
      data: {
        ...input,
        inventory: { create: { stock: 0, lastUpdatedAt: new Date() } },
      },
      include: PRODUCT_INCLUDE,
    });
    return { ok: true, product: toListItem(product) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, reason: "duplicate_sku" };
    }
    throw err;
  }
}

export async function getProductById(id: string): Promise<ProductListItem | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: PRODUCT_INCLUDE,
  });
  return product ? toListItem(product) : null;
}

export type UpdateProductResult =
  | { ok: true; product: ProductListItem }
  | { ok: false; reason: "not_found" | "duplicate_sku" };

export async function updateProduct(
  id: string,
  input: ProductUpdateInput,
): Promise<UpdateProductResult> {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: input,
      include: PRODUCT_INCLUDE,
    });
    return { ok: true, product: toListItem(product) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return { ok: false, reason: "duplicate_sku" };
      if (err.code === "P2025") return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}

export type DeleteProductResult =
  | { ok: true; deactivated: false }
  | { ok: true; deactivated: true; product: ProductListItem }
  | { ok: false; reason: "not_found" };

export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });

  try {
    if (orderItemCount > 0) {
      const product = await prisma.product.update({
        where: { id },
        data: { status: Status.INACTIVE },
        include: PRODUCT_INCLUDE,
      });
      return { ok: true, deactivated: true, product: toListItem(product) };
    }

    await prisma.product.delete({ where: { id } });
    return { ok: true, deactivated: false };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}
