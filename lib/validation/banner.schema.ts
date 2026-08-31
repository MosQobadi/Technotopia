import { z } from "zod";
import { paginationQuerySchema, statusSchema } from "./common";

/**
 * Banner images have to come from the upload endpoint, which always writes to
 * `public/uploads` and returns a root-relative `/uploads/<file>` path. Absolute
 * URLs are rejected: the storefront renders banners with `next/image`, which
 * throws on any host not allow-listed in `next.config.ts` — taking the whole
 * home page down.
 */
const requiredImageSchema = z
  .string()
  .min(1, "Image is required")
  .regex(
    /^\/uploads\//,
    "Image must be uploaded through the admin panel, not linked from an external URL",
  );

const linkSchema = z
  .string()
  .regex(/^(https?:\/\/|\/)/, "Link must be a valid URL")
  .nullable()
  .optional();

export const bannerCreateSchema = z.object({
  image: requiredImageSchema,
  tag: z.string().max(50).nullable().optional(),
  headline: z.string().min(1).max(200),
  subheadline: z.string().max(300).nullable().optional(),
  ctaLabel: z.string().max(50).nullable().optional(),
  link: linkSchema,
  displayOrder: z.number().int().min(0).default(0),
  status: statusSchema,
});

export const bannerUpdateSchema = bannerCreateSchema.partial();

export const bannerListQuerySchema = paginationQuerySchema.extend({
  status: statusSchema.optional(),
});

export const bannerReorderSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      displayOrder: z.number().int().min(0),
    }),
  )
  .min(1);

export type BannerCreateInput = z.infer<typeof bannerCreateSchema>;
export type BannerUpdateInput = z.infer<typeof bannerUpdateSchema>;
export type BannerListQuery = z.infer<typeof bannerListQuerySchema>;
export type BannerReorderInput = z.infer<typeof bannerReorderSchema>;
