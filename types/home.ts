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
  /** The discount the admin set. 0 when the product is not discounted. */
  discountPercent: number;
}

export interface HomeBestSellerView extends HomeProductView {
  brand: string;
  rank: number;
  /** ISO timestamp — used only to support the "Newest" sort option, not displayed. */
  createdAt: string;
}

/** A category as the home page's browse section draws it: a photograph, a name,
 *  and the slug the catalog filters by. */
export interface HomeCategoryView {
  id: string;
  slug: string;
  name: string;
  image: string | null;
}

/** A brand as the home page's browse section draws it: a logo, a name, and the
 *  slug the catalog filters by. `logo` is non-null — a brand without one is not
 *  in the list at all (see getBrowseBrands). */
export interface HomeBrandView {
  id: string;
  slug: string;
  name: string;
  logo: string;
}

export interface HomeOption {
  id: string;
  name: string;
}

export interface HomeData {
  banners: HomeBannerView[];
  deals: HomeProductView[];
  featuredProducts: HomeProductView[];
  bestSellers: HomeBestSellerView[];
  browseCategories: HomeCategoryView[];
  browseBrands: HomeBrandView[];
  categories: HomeOption[];
  brands: HomeOption[];
}
