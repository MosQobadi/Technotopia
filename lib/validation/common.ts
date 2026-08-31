import { z } from "zod";

/** Strips HTML tags so free text can never carry executable markup (stored XSS defense-in-depth). */
function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

/** Raw payload cap before stripping — generous so legitimate HTML-padded input isn't rejected pre-strip. */
const RAW_INPUT_MAX = 20000;

/** Plain free-text field (description, note, etc.) — HTML-stripped, then length-bounded. */
export function freeTextSchema(min: number, max: number) {
  return z
    .string()
    .max(RAW_INPUT_MAX)
    .transform(stripHtml)
    .pipe(z.string().min(min).max(max));
}

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

/** Mirrors Prisma's `PaymentStatus` enum. */
export const paymentStatusSchema = z.enum(["UNPAID", "PAID", "REFUNDED"]);

/** Mirrors Prisma's `PaymentMethod` enum. */
export const paymentMethodSchema = z.enum(["CARD", "BANK_TRANSFER"]);

/** kebab-case slug, e.g. "wireless-microphones". */
export const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case");

export const tagsSchema = z.array(z.string().min(1).max(50)).max(20).default([]);

/**
 * Images have to come from the upload endpoint, which always writes to
 * `public/uploads` and returns a root-relative `/uploads/<file>` path. Absolute
 * URLs are rejected: the storefront renders them with `next/image`, which throws
 * on any host not allow-listed in `next.config.ts` — taking the whole page down.
 */
export const uploadedImagePathSchema = z
  .string()
  .min(1, "Image is required")
  .regex(
    /^\/uploads\//,
    "Image must be uploaded through the admin panel, not linked from an external URL",
  );

/** Optional variant of {@link uploadedImagePathSchema} for resources where the image may be absent. */
export const imageUrlSchema = uploadedImagePathSchema.nullable().optional();

/** Shared page/pageSize query params for list endpoints. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
