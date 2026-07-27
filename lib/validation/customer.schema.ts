import { z } from "zod";
import { paginationQuerySchema, statusSchema } from "./common";

export const customerStatusSchema = z.object({
  status: statusSchema,
});

export const customerListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  status: statusSchema.optional(),
});

export type CustomerStatusInput = z.infer<typeof customerStatusSchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
