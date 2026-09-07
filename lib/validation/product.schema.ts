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

/**
 * The PLP page's own read of `searchParams`, as opposed to the API route's
 * `storefrontProductListQuerySchema` above. Two differences, both because this
 * one parses a URL a visitor can hand-edit rather than a request a client made:
 *
 * - `brand` and `status` are repeatable (`?brand=sony&brand=boya`), because the
 *   sidebar's checkboxes are multi-select. The API keeps its single-value
 *   contract.
 * - Nothing throws. A junk param falls back to its default and the catalog still
 *   renders — a 500 on `?page=banana` would be a worse answer than page 1.
 *
 * `category` and `brand` are slugs, names or ids here; the page resolves them
 * against the real options (see `resolveOptionParam`), because links into this
 * listing were written in all three vocabularies.
 */
const listParamValuesSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : [value]))
  // A key present but empty (`?brand=`) means the customer cleared it, not that
  // they filtered on "".
  .transform((values) => values.map((value) => value.trim()).filter((value) => value !== ""))
  .catch([]);

export const storefrontProductListPageQuerySchema = z.object({
  category: z.string().trim().min(1).optional().catch(undefined),
  brand: listParamValuesSchema,
  // Filtered rather than rejected: one unknown status shouldn't discard the
  // others the visitor did pick.
  status: listParamValuesSchema.transform((values) =>
    values.filter((value): value is (typeof INVENTORY_STATUSES)[number] =>
      (INVENTORY_STATUSES as readonly string[]).includes(value),
    ),
  ),
  maxPrice: z.coerce.number().int().min(0).optional().catch(undefined),
  sort: storefrontProductSortSchema.catch("sold"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type StorefrontProductSort = z.infer<typeof storefrontProductSortSchema>;
export type StorefrontProductListQuery = z.infer<typeof storefrontProductListQuerySchema>;
export type StorefrontProductListPageQuery = z.infer<typeof storefrontProductListPageQuerySchema>;
