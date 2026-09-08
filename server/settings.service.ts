import { prisma } from "@/lib/db";
import type { SettingsInput } from "@/lib/validation";

/**
 * The subset of settings the storefront is allowed to read. Deliberately a
 * hand-written shape rather than a filtered `getAllSettings()`: the Setting
 * model is an open key/value store, so anything a future admin tab writes into
 * it stays private until it is named here on purpose. Shipping and payment
 * configuration, when they arrive, do not belong in it.
 */
export interface PublicSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

// An unset key is an empty string rather than undefined, so a caller renders
// "nothing configured" the same way whether the row is missing or blank — the
// admin's General tab saves a cleared field as "".
export async function getPublicSettings(): Promise<PublicSettings> {
  const settings = await getAllSettings();

  return {
    storeName: settings.storeName ?? "",
    supportEmail: settings.supportEmail ?? "",
    supportPhone: settings.supportPhone ?? "",
  };
}

export async function upsertSettings(input: SettingsInput): Promise<Record<string, string>> {
  await Promise.all(
    Object.entries(input).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );
  return getAllSettings();
}
