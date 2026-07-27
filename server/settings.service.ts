import { prisma } from "@/lib/db";
import type { SettingsInput } from "@/lib/validation";

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
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
