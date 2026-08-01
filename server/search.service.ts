import { prisma } from "@/lib/db";
import { Status } from "@/lib/generated/prisma/enums";
import type { SearchScope } from "@/lib/validation";
import type { StorefrontSearchResult } from "@/types/search";
import { STOREFRONT_PRODUCT_SELECT, toStorefrontProductView } from "./storefront-product.service";

const SEARCH_RESULT_LIMIT = 5;

export interface SearchStorefrontParams {
  scope: SearchScope;
  q: string;
}

export async function searchStorefront({
  scope,
  q,
}: SearchStorefrontParams): Promise<StorefrontSearchResult> {
  const includeProducts = scope === "all" || scope === "products";
  const includeCategories = scope === "all" || scope === "categories";
  const includeBrands = scope === "all" || scope === "brands";

  const [products, categories, brands] = await Promise.all([
    includeProducts
      ? prisma.product.findMany({
          where: { status: Status.ACTIVE, name: { contains: q, mode: "insensitive" } },
          select: STOREFRONT_PRODUCT_SELECT,
          take: SEARCH_RESULT_LIMIT,
        })
      : Promise.resolve([]),
    includeCategories
      ? prisma.category.findMany({
          where: { status: Status.ACTIVE, name: { contains: q, mode: "insensitive" } },
          select: { id: true, slug: true, name: true, image: true },
          take: SEARCH_RESULT_LIMIT,
        })
      : Promise.resolve([]),
    includeBrands
      ? prisma.brand.findMany({
          where: { status: Status.ACTIVE, name: { contains: q, mode: "insensitive" } },
          select: { id: true, slug: true, name: true, logo: true },
          take: SEARCH_RESULT_LIMIT,
        })
      : Promise.resolve([]),
  ]);

  return {
    products: products.map(toStorefrontProductView),
    categories,
    brands,
  };
}
