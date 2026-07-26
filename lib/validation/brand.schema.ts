import { z } from "zod";
import { imageUrlSchema, slugSchema, statusSchema } from "./common";

export const brandCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slugSchema.optional(),
  logo: imageUrlSchema,
  status: statusSchema,
});

export const brandUpdateSchema = brandCreateSchema.partial();

export type BrandCreateInput = z.infer<typeof brandCreateSchema>;
export type BrandUpdateInput = z.infer<typeof brandUpdateSchema>;
