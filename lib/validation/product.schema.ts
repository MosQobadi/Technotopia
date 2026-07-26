import { z } from "zod";
import { imageUrlSchema, statusSchema, tagsSchema } from "./common";

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "SKU may only contain letters, numbers, - and _"),
  categoryId: z.string().min(1),
  brandId: z.string().min(1),
  price: z.number().min(0),
  discountPercent: z.number().int().min(0).max(100).default(0),
  tags: tagsSchema,
  shortDescription: z.string().min(1).max(300),
  longDescription: z.string().min(1).max(5000),
  image: imageUrlSchema,
  status: statusSchema,
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
