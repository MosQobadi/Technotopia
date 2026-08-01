import { z } from "zod";
import {
  freeTextSchema,
  orderStatusSchema,
  paginationQuerySchema,
  paymentMethodSchema,
  paymentStatusSchema,
} from "./common";

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

/** Storefront checkout — shipping address + payment method for the customer's current cart. */
export const createOrderSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(30),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(1).max(20),
  paymentMethod: paymentMethodSchema,
});

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
export type OrderNoteInput = z.infer<typeof orderNoteSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
