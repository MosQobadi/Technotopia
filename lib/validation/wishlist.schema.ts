import { z } from "zod";

export const wishlistAddItemSchema = z.object({
  productId: z.string().min(1),
});

export type WishlistAddItemInput = z.infer<typeof wishlistAddItemSchema>;
