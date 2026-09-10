import type { InventoryStatus } from "@/types/inventory";

// Stock is stored as a number and read as one of three states. The rule lives
// here, once: the admin's product list used to carry its own copy of it, and
// the status filter its own copy of the threshold.

/** The first quantity that reads as plenty. Above zero and below it is Low Stock. */
export const LOW_STOCK_THRESHOLD = 10;

/** 0 = Out of Stock, 1-9 = Low Stock, 10+ = In Stock — see Prisma's `Inventory` model comment. */
export function deriveInventoryStatus(stock: number): InventoryStatus {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock < LOW_STOCK_THRESHOLD) return "LOW_STOCK";
  return "IN_STOCK";
}

/** The admin's names for the three states. The storefront translates its own. */
export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  OUT_OF_STOCK: "Out of Stock",
  LOW_STOCK: "Low Stock",
  IN_STOCK: "In Stock",
};
