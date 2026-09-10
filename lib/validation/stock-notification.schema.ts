import { z } from "zod";

const emailSchema = z.string().email();

/** Every run of digits a phone number can hold once its separators are gone. */
const PHONE_PATTERN = /^\+?\d{7,15}$/;

/**
 * Persian (U+06F0–06F9) and Arabic-Indic (U+0660–0669) digits to ASCII. Both
 * blocks end in the digit's own value, so the low four bits of the code point
 * are the digit. A Farsi keyboard types the first kind; without this, a phone
 * number typed on the Farsi storefront is never a phone number.
 */
function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) =>
    String(digit.charCodeAt(0) & 0xf),
  );
}

/**
 * One stored spelling per contact, so the admin's list reads cleanly and the
 * same person asking twice is recognisable as one request: emails lowercased,
 * phone numbers stripped of the spaces, dashes and brackets people type.
 */
function normalizeContact(raw: string): string {
  const value = toLatinDigits(raw).trim();
  if (value.includes("@")) return value.toLowerCase();
  return value.replace(/[\s\-().]/g, "");
}

function isEmailOrPhone(value: string): boolean {
  return value.includes("@") ? emailSchema.safeParse(value).success : PHONE_PATTERN.test(value);
}

/** The storefront's back-in-stock request: one field, an email or a phone number. */
export const stockNotificationCreateSchema = z.object({
  contact: z
    .string()
    .max(200)
    .transform(normalizeContact)
    .refine(isEmailOrPhone, "Enter a valid email address or phone number"),
});

/**
 * The admin marks the requests it was shown, by id — never "everything pending",
 * which would also stamp a request that arrived while the modal was open and
 * that nobody has contacted.
 */
export const stockNotificationMarkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export type StockNotificationCreateInput = z.input<typeof stockNotificationCreateSchema>;
export type StockNotificationMarkInput = z.infer<typeof stockNotificationMarkSchema>;
