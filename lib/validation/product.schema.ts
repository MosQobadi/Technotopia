import { z } from "zod";
import { INVENTORY_STATUSES } from "@/types/inventory";
import {
  freeTextSchema,
  imageUrlSchema,
  paginationQuerySchema,
  slugSchema,
  statusSchema,
  tagsSchema,
} from "./common";

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slugSchema.optional(),
  sku: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "SKU may only contain letters, numbers, - and _"),
  categoryId: z.string().min(1),
  brandId: z.string().min(1),
  price: z.number().int().min(0),
  discountPercent: z.number().int().min(0).max(100).default(0),
  tags: tagsSchema,
  shortDescription: freeTextSchema(1, 300),
  longDescription: freeTextSchema(1, 5000),
  image: imageUrlSchema,
  status: statusSchema,
  isFeatured: z.boolean().default(false),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  category: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  status: statusSchema.optional(),
});

export const storefrontProductSortSchema = z.enum(["sold", "priceAsc", "priceDesc", "new"]);

/** Public product listing — `status` filters by derived stock status, not Product.status
 * (inactive products are always excluded server-side, never exposed as a filter option). */
export const storefrontProductListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  category: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  status: z.enum(INVENTORY_STATUSES).optional(),
  sort: storefrontProductSortSchema.default("sold"),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type StorefrontProductSort = z.infer<typeof storefrontProductSortSchema>;
export type StorefrontProductListQuery = z.infer<typeof storefrontProductListQuerySchema>;
