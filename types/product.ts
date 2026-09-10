import type { InventoryStatus } from "./inventory";

export interface StorefrontProductView {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  category: string;
  brand: string;
  price: number;
  originalPrice?: number;
  /** The discount the admin set. 0 when the product is not discounted. */
  discountPercent: number;
  createdAt: string;
  stockStatus: InventoryStatus;
}

export interface StorefrontProductDetail extends StorefrontProductView {
  /**
   * Units on the shelf. The PDP's stepper stops here and its badge names it when
   * low. Not a secret: the cart lookup already answers it for any product id.
   */
  stock: number;
  tags: string[];
  shortDescription: string;
  longDescription: string;
}

export interface StorefrontProductDetailResult {
  product: StorefrontProductDetail;
  related: StorefrontProductView[];
}

export interface StorefrontFilterOption {
  id: string;
  name: string;
  /** What the listing's URL carries — see `buildProductListHref`. */
  slug: string;
}

export interface StorefrontProductListResult {
  products: StorefrontProductView[];
  total: number;
  page: number;
  pageSize: number;
  categories: StorefrontFilterOption[];
  brands: StorefrontFilterOption[];
}
