import { z } from "zod";
import { imageUrlSchema, slugSchema, statusSchema, tagsSchema } from "./common";

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slugSchema.optional(),
  tags: tagsSchema,
  shortDescription: z.string().min(1).max(300),
  longDescription: z.string().min(1).max(5000),
  image: imageUrlSchema,
  status: statusSchema,
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
