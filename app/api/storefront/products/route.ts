import { NextResponse, type NextRequest } from "next/server";
import { storefrontProductListQuerySchema } from "@/lib/validation";
import { listStorefrontProducts } from "@/server/storefront-product.service";
import { listCategoryOptions } from "@/server/category.service";
import { listBrandOptions } from "@/server/brand.service";

export async function GET(request: NextRequest) {
  const parsed = storefrontProductListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const { search, category, brand, maxPrice, status, sort, page, pageSize } = parsed.data;
  const [{ products, total }, categories, brands] = await Promise.all([
    listStorefrontProducts({
      search,
      categoryId: category,
      // This route's contract stays single-valued; the multi-select brand and
      // status filters are the PLP page's own reading of its search params.
      brandIds: brand ? [brand] : undefined,
      maxPrice,
      stockStatuses: status ? [status] : undefined,
      sort,
      page,
      pageSize,
    }),
    listCategoryOptions(),
    listBrandOptions(),
  ]);

  return NextResponse.json({
    success: true,
    data: { products, total, page, pageSize, categories, brands },
  });
}
