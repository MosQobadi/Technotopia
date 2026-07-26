import { z } from "zod";

/** Mirrors Prisma's `Status` enum (Category, Brand, Product, User). */
export const statusSchema = z.enum(["ACTIVE", "INACTIVE"]);

/** Mirrors Prisma's `OrderStatus` enum. */
export const orderStatusSchema = z.enum([
  "PENDING",
  "SENDING",
  "SENT",
  "DELIVERED",
  "CANCELLED",
]);

/** kebab-case slug, e.g. "wireless-microphones". */
export const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case");

export const tagsSchema = z.array(z.string().min(1).max(50)).max(20).default([]);

export const imageUrlSchema = z.string().url().nullable().optional();

/** Shared page/pageSize query params for list endpoints. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
