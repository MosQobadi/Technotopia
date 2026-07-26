import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Brand } from "@/lib/generated/prisma/client";
import type { Status } from "@/lib/generated/prisma/enums";
import { slugify } from "@/lib/slugify";
import type { BrandCreateInput, BrandUpdateInput } from "@/lib/validation";

export interface BrandWithProductCount extends Brand {
  productCount: number;
}

function withProductCount(brand: Brand & { _count: { products: number } }): BrandWithProductCount {
  const { _count, ...rest } = brand;
  return { ...rest, productCount: _count.products };
}

const BRAND_INCLUDE = { _count: { select: { products: true } } } as const;

export interface ListBrandsParams {
  search?: string;
  status?: Status;
  page: number;
  pageSize: number;
}

export interface ListBrandsResult {
  brands: BrandWithProductCount[];
  total: number;
}

export async function listBrands({
  search,
  status,
  page,
  pageSize,
}: ListBrandsParams): Promise<ListBrandsResult> {
  const where: Prisma.BrandWhereInput = {
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const [brands, total] = await Promise.all([
    prisma.brand.findMany({
      where,
      include: BRAND_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.brand.count({ where }),
  ]);

  return { brands: brands.map(withProductCount), total };
}

export type CreateBrandResult =
  | { ok: true; brand: BrandWithProductCount }
  | { ok: false; reason: "duplicate_slug" };

export async function createBrand(input: BrandCreateInput): Promise<CreateBrandResult> {
  const slug = input.slug || slugify(input.name);

  try {
    const brand = await prisma.brand.create({
      data: { ...input, slug },
      include: BRAND_INCLUDE,
    });
    return { ok: true, brand: withProductCount(brand) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, reason: "duplicate_slug" };
    }
    throw err;
  }
}

export async function getBrandById(id: string): Promise<BrandWithProductCount | null> {
  const brand = await prisma.brand.findUnique({
    where: { id },
    include: BRAND_INCLUDE,
  });
  return brand ? withProductCount(brand) : null;
}

export type UpdateBrandResult =
  | { ok: true; brand: BrandWithProductCount }
  | { ok: false; reason: "not_found" | "duplicate_slug" };

export async function updateBrand(id: string, input: BrandUpdateInput): Promise<UpdateBrandResult> {
  try {
    const brand = await prisma.brand.update({
      where: { id },
      data: input,
      include: BRAND_INCLUDE,
    });
    return { ok: true, brand: withProductCount(brand) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return { ok: false, reason: "duplicate_slug" };
      if (err.code === "P2025") return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}

export type DeleteBrandResult = { ok: true } | { ok: false; reason: "not_found" | "has_products" };

export async function deleteBrand(id: string): Promise<DeleteBrandResult> {
  const productCount = await prisma.product.count({ where: { brandId: id } });
  if (productCount > 0) {
    return { ok: false, reason: "has_products" };
  }

  try {
    await prisma.brand.delete({ where: { id } });
    return { ok: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}
