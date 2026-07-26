import { z } from "zod";
import {
  imageUrlSchema,
  paginationQuerySchema,
  slugSchema,
  statusSchema,
  tagsSchema,
} from "./common";

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

export const categoryListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  status: statusSchema.optional(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;
