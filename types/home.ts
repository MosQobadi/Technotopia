export interface HomeBannerView {
  id: string;
  image: string;
  tag: string | null;
  headline: string;
  subcopy: string | null;
  cta: { label: string; href: string } | null;
}

export interface HomeProductView {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  category: string;
  price: number;
  originalPrice?: number;
}

export interface HomeBestSellerView extends HomeProductView {
  brand: string;
  rank: number;
  /** ISO timestamp — used only to support the "Newest" sort option, not displayed. */
  createdAt: string;
}

export interface HomeOption {
  id: string;
  name: string;
}

export interface HomeData {
  banners: HomeBannerView[];
  featuredProducts: HomeProductView[];
  bestSellers: HomeBestSellerView[];
  categories: HomeOption[];
  brands: HomeOption[];
}
