import type { StorefrontProductView } from "./product";

export interface StorefrontSearchCategoryView {
  id: string;
  slug: string;
  name: string;
  image: string | null;
}

export interface StorefrontSearchBrandView {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
}

export interface StorefrontSearchResult {
  products: StorefrontProductView[];
  categories: StorefrontSearchCategoryView[];
  brands: StorefrontSearchBrandView[];
}
