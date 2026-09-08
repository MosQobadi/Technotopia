import { prisma } from "@/lib/db";
import { Status } from "@/lib/generated/prisma/enums";
import { toDisplayPrice } from "@/lib/storefront/pricing";
import type { HomeCategoryView } from "@/types/home";
import { listBrandOptions, type BrandOption } from "./brand.service";
import { listCategoryOptions, type CategoryOption } from "./category.service";
import { listStorefrontProducts } from "./storefront-product.service";

const HOME_BANNER_LIMIT = 3;
const FEATURED_PRODUCT_LIMIT = 10;
const DEAL_LIMIT = 12;
const BEST_SELLER_LIMIT = 10;
const BROWSE_CATEGORY_LIMIT = 8;

const PRODUCT_SUMMARY_SELECT = {
  id: true,
  slug: true,
  name: true,
  image: true,
  price: true,
  discountPercent: true,
  category: { select: { name: true } },
} as const;

type ProductSummary = Awaited<
  ReturnType<typeof prisma.product.findMany<{ select: typeof PRODUCT_SUMMARY_SELECT }>>
>[number];

export interface HomeProductView {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  category: string;
  price: number;
  originalPrice?: number;
  /** The discount the admin set. 0 when the product is not discounted. */
  discountPercent: number;
}

export interface HomeBannerView {
  id: string;
  image: string;
  tag: string | null;
  headline: string;
  subcopy: string | null;
  cta: { label: string; href: string } | null;
}

export interface HomeBestSellerView extends HomeProductView {
  brand: string;
  rank: number;
  /** ISO timestamp — used only to support the "Newest" sort option, not displayed. */
  createdAt: string;
}

export interface HomeData {
  banners: HomeBannerView[];
  deals: HomeProductView[];
  featuredProducts: HomeProductView[];
  bestSellers: HomeBestSellerView[];
  browseCategories: HomeCategoryView[];
  categories: CategoryOption[];
  brands: BrandOption[];
}

function toProductView(product: ProductSummary): HomeProductView {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image,
    category: product.category.name,
    ...toDisplayPrice(product.price, product.discountPercent),
  };
}

async function getHomeBanners(): Promise<HomeBannerView[]> {
  const banners = await prisma.banner.findMany({
    where: { status: Status.ACTIVE },
    orderBy: { displayOrder: "asc" },
    take: HOME_BANNER_LIMIT,
  });

  return banners.map((banner) => ({
    id: banner.id,
    image: banner.image,
    tag: banner.tag,
    headline: banner.headline,
    subcopy: banner.subheadline,
    cta: banner.ctaLabel && banner.link ? { label: banner.ctaLabel, href: banner.link } : null,
  }));
}

// Everything currently marked down, deepest cut first — the shelf under the
// hero is a "what is cheap right now" question, so the only ordering that
// answers it is the discount itself. `createdAt` breaks ties so two products at
// the same percentage don't swap places between requests.
async function getDeals(): Promise<HomeProductView[]> {
  const products = await prisma.product.findMany({
    where: { status: Status.ACTIVE, discountPercent: { gt: 0 } },
    select: PRODUCT_SUMMARY_SELECT,
    orderBy: [{ discountPercent: "desc" }, { createdAt: "desc" }],
    take: DEAL_LIMIT,
  });

  return products.map(toProductView);
}

async function getFeaturedProducts(): Promise<HomeProductView[]> {
  const products = await prisma.product.findMany({
    where: { status: Status.ACTIVE, isFeatured: true },
    select: PRODUCT_SUMMARY_SELECT,
    orderBy: { createdAt: "desc" },
    take: FEATURED_PRODUCT_LIMIT,
  });

  return products.map(toProductView);
}

// The categories the home page offers to browse, as opposed to the ones
// `listCategoryOptions` returns: that list is the best-sellers filter's
// vocabulary and wants every category, this one is a shelf of photographs and
// wants the shop's front eight. Ordered by name so the shelf doesn't reshuffle
// itself between requests.
async function getBrowseCategories(): Promise<HomeCategoryView[]> {
  return prisma.category.findMany({
    where: { status: Status.ACTIVE },
    select: { id: true, slug: true, name: true, image: true },
    orderBy: { name: "asc" },
    take: BROWSE_CATEGORY_LIMIT,
  });
}

async function getBestSellers(): Promise<HomeBestSellerView[]> {
  const { products } = await listStorefrontProducts({
    sort: "sold",
    page: 1,
    pageSize: BEST_SELLER_LIMIT,
  });

  return products.map((product, index) => ({ ...product, rank: index + 1 }));
}

export async function getHomeData(): Promise<HomeData> {
  const [banners, deals, featuredProducts, bestSellers, browseCategories, categories, brands] =
    await Promise.all([
      getHomeBanners(),
      getDeals(),
      getFeaturedProducts(),
      getBestSellers(),
      getBrowseCategories(),
      listCategoryOptions(),
      listBrandOptions(),
    ]);

  return { banners, deals, featuredProducts, bestSellers, browseCategories, categories, brands };
}
