import { z } from "zod";
import { MAX_CART_ITEMS, MAX_CART_QUANTITY } from "@/lib/storefront/cart";

/**
 * The cart lookup's only input. The ids are not personal data and nothing is
 * created by reading them, so the reconciliation endpoint is a GET with a query
 * string rather than a POST with a body.
 */
export const cartLookupQuerySchema = z.object({
  ids: z
    .string()
    .max(MAX_CART_ITEMS * 40)
    .optional(),
});

/** One line of a cart as it is submitted to checkout — id and quantity, never a price. */
export const cartLineInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
});

export type CartLookupQuery = z.infer<typeof cartLookupQuerySchema>;
export type CartLineInput = z.infer<typeof cartLineInputSchema>;
