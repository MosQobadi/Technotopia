import { z } from "zod";
import { freeTextSchema } from "./common";

/**
 * The Setting model (Task 11.1) is a key/value store, so a PATCH is a partial
 * key -> value object that gets upserted one row at a time.
 */
export const settingsSchema = z
  .record(z.string().min(1).max(100), freeTextSchema(0, 2000))
  .refine((settings) => Object.keys(settings).length > 0, {
    message: "At least one setting must be provided",
  });

export type SettingsInput = z.infer<typeof settingsSchema>;
