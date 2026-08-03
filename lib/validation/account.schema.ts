import { z } from "zod";

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().min(1).email(),
  phone: z.string().trim().min(1).max(30),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const addressCreateSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(30),
  addressLine: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  isDefault: z.boolean().default(false),
});

export type AddressCreateInput = z.infer<typeof addressCreateSchema>;

export const addressUpdateSchema = addressCreateSchema.partial();

export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;
