import { z } from "zod";
import { imageUrlSchema, paginationQuerySchema, slugSchema, statusSchema } from "./common";

export const brandCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slugSchema.optional(),
  logo: imageUrlSchema,
  status: statusSchema,
});

export const brandUpdateSchema = brandCreateSchema.partial();

export const brandListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  status: statusSchema.optional(),
});

export type BrandCreateInput = z.infer<typeof brandCreateSchema>;
export type BrandUpdateInput = z.infer<typeof brandUpdateSchema>;
export type BrandListQuery = z.infer<typeof brandListQuerySchema>;
