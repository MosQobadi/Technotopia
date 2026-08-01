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
  createdAt: string;
  stockStatus: InventoryStatus;
}

export interface StorefrontProductDetail extends StorefrontProductView {
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
}

export interface StorefrontProductListResult {
  products: StorefrontProductView[];
  total: number;
  page: number;
  pageSize: number;
  categories: StorefrontFilterOption[];
  brands: StorefrontFilterOption[];
}
