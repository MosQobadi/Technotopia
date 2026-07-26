import { z } from "zod";

export const inventoryUpdateSchema = z.object({
  addStock: z.number().int().positive(),
});

export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>;
