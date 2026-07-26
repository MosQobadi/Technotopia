import { z } from "zod";
import { orderStatusSchema } from "./common";

export const orderStatusUpdateSchema = z.object({
  status: orderStatusSchema,
});

export const orderNoteSchema = z.object({
  adminNote: z.string().max(5000),
});

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
export type OrderNoteInput = z.infer<typeof orderNoteSchema>;
