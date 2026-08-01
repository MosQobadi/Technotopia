import { z } from "zod";

export const searchScopeSchema = z.enum(["all", "products", "categories", "brands"]);

export const storefrontSearchQuerySchema = z.object({
  scope: z
    .string()
    .optional()
    .transform((value) => (value ?? "all").toLowerCase())
    .pipe(searchScopeSchema),
  q: z.string().trim().min(1).max(200),
});

export type SearchScope = z.infer<typeof searchScopeSchema>;
export type StorefrontSearchQuery = z.infer<typeof storefrontSearchQuerySchema>;
