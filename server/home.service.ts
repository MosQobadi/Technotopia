import { prisma } from "@/lib/db";
import { Status } from "@/lib/generated/prisma/enums";
import { listBrandOptions, type BrandOption } from "./brand.service";
import { listCategoryOptions, type CategoryOption } from "./category.service";
import { listStorefrontProducts } from "./storefront-product.service";

const HOME_BANNER_LIMIT = 3;
const FEATURED_PRODUCT_LIMIT = 10;
const BEST_SELLER_LIMIT = 10;

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
  featuredProducts: HomeProductView[];
  bestSellers: HomeBestSellerView[];
  categories: CategoryOption[];
  brands: BrandOption[];
}

function toProductView(product: ProductSummary): HomeProductView {
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
    price,
    originalPrice: hasDiscount ? product.price : undefined,
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

async function getFeaturedProducts(): Promise<HomeProductView[]> {
  const products = await prisma.product.findMany({
    where: { status: Status.ACTIVE, isFeatured: true },
    select: PRODUCT_SUMMARY_SELECT,
    orderBy: { createdAt: "desc" },
    take: FEATURED_PRODUCT_LIMIT,
  });

  return products.map(toProductView);
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
  const [banners, featuredProducts, bestSellers, categories, brands] = await Promise.all([
    getHomeBanners(),
    getFeaturedProducts(),
    getBestSellers(),
    listCategoryOptions(),
    listBrandOptions(),
  ]);

  return { banners, featuredProducts, bestSellers, categories, brands };
}
