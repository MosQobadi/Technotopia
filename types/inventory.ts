/** Derived (not stored) status thresholds — see the comment on Prisma's `Inventory` model. */
export const INVENTORY_STATUSES = ["OUT_OF_STOCK", "LOW_STOCK", "IN_STOCK"] as const;

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];
