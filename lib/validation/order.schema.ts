import { z } from "zod";
import { freeTextSchema, orderStatusSchema, paginationQuerySchema, paymentStatusSchema } from "./common";

export const orderStatusUpdateSchema = z.object({
  status: orderStatusSchema,
});

export const orderNoteSchema = z.object({
  adminNote: freeTextSchema(0, 5000),
});

export const orderListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  status: orderStatusSchema.optional(),
  payment: paymentStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
export type OrderNoteInput = z.infer<typeof orderNoteSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
