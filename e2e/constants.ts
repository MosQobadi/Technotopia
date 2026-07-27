// Seeded by prisma/seed.ts — see the `admin` upsert there.
export const ADMIN_EMAIL = "admin@technotopia.com";
export const ADMIN_PASSWORD = "password123";

export const STORAGE_STATE_PATH = "e2e/.auth/admin.json";

/** Unique-enough suffix for names/slugs/SKUs so repeat runs don't collide. */
export function uniqueSuffix() {
  return Date.now().toString(36);
}
