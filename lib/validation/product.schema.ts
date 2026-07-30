import { z } from "zod";
import {
  freeTextSchema,
  imageUrlSchema,
  paginationQuerySchema,
  statusSchema,
  tagsSchema,
} from "./common";

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
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

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
