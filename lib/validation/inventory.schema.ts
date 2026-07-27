import { z } from "zod";
import { INVENTORY_STATUSES } from "@/types/inventory";
import { paginationQuerySchema } from "./common";

export const inventoryUpdateSchema = z.object({
  addStock: z.number().int().positive(),
});

export const inventoryListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  category: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  status: z.enum(INVENTORY_STATUSES).optional(),
});

export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>;
export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
