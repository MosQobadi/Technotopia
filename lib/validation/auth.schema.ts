import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Storefront login accepts either the account's email or phone number as the identifier. */
export const storefrontLoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export type StorefrontLoginInput = z.infer<typeof storefrontLoginSchema>;

export const signupSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().min(1).email(),
  phone: z.string().trim().min(1).max(30),
  password: z.string().min(8).max(200),
});

export type SignupInput = z.infer<typeof signupSchema>;
