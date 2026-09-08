import { z } from "zod";
import { MAX_CART_ITEMS } from "@/lib/storefront/cart";
import { cartLineInputSchema } from "./cart.schema";
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

/** Storefront checkout — the fields the customer actually fills in. */
export const checkoutDetailsSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(30),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(1).max(20),
  paymentMethod: paymentMethodSchema,
});

/**
 * What an order POST carries. The cart lives in the browser, so its lines are
 * submitted with the address — as ids and quantities only. Prices are never
 * accepted from the client; the server re-reads them from the catalog.
 */
export const createOrderSchema = checkoutDetailsSchema.extend({
  items: z.array(cartLineInputSchema).min(1).max(MAX_CART_ITEMS),
});

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
export type OrderNoteInput = z.infer<typeof orderNoteSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
export type CheckoutDetailsInput = z.infer<typeof checkoutDetailsSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
