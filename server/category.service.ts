import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Category } from "@/lib/generated/prisma/client";
import type { Status } from "@/lib/generated/prisma/enums";
import { slugify } from "@/lib/slugify";
import type { CategoryCreateInput, CategoryUpdateInput } from "@/lib/validation";

export interface CategoryWithProductCount extends Category {
  productCount: number;
}

function withProductCount(
  category: Category & { _count: { products: number } },
): CategoryWithProductCount {
  const { _count, ...rest } = category;
  return { ...rest, productCount: _count.products };
}

const CATEGORY_INCLUDE = { _count: { select: { products: true } } } as const;

export interface ListCategoriesParams {
  search?: string;
  status?: Status;
  page: number;
  pageSize: number;
}

export interface ListCategoriesResult {
  categories: CategoryWithProductCount[];
  total: number;
}

export async function listCategories({
  search,
  status,
  page,
  pageSize,
}: ListCategoriesParams): Promise<ListCategoriesResult> {
  const where: Prisma.CategoryWhereInput = {
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: CATEGORY_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.category.count({ where }),
  ]);

  return { categories: categories.map(withProductCount), total };
}

export type CreateCategoryResult =
  | { ok: true; category: CategoryWithProductCount }
  | { ok: false; reason: "duplicate_slug" };

export async function createCategory(input: CategoryCreateInput): Promise<CreateCategoryResult> {
  const slug = input.slug || slugify(input.name);

  try {
    const category = await prisma.category.create({
      data: { ...input, slug },
      include: CATEGORY_INCLUDE,
    });
    return { ok: true, category: withProductCount(category) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, reason: "duplicate_slug" };
    }
    throw err;
  }
}

export async function getCategoryById(id: string): Promise<CategoryWithProductCount | null> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: CATEGORY_INCLUDE,
  });
  return category ? withProductCount(category) : null;
}

export type UpdateCategoryResult =
  | { ok: true; category: CategoryWithProductCount }
  | { ok: false; reason: "not_found" | "duplicate_slug" };

export async function updateCategory(
  id: string,
  input: CategoryUpdateInput,
): Promise<UpdateCategoryResult> {
  try {
    const category = await prisma.category.update({
      where: { id },
      data: input,
      include: CATEGORY_INCLUDE,
    });
    return { ok: true, category: withProductCount(category) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return { ok: false, reason: "duplicate_slug" };
      if (err.code === "P2025") return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}

export type DeleteCategoryResult = { ok: true } | { ok: false; reason: "not_found" | "has_products" };

export async function deleteCategory(id: string): Promise<DeleteCategoryResult> {
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return { ok: false, reason: "has_products" };
  }

  try {
    await prisma.category.delete({ where: { id } });
    return { ok: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}
