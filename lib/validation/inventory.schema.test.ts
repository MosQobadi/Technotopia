import { describe, expect, it } from "vitest";
import { inventoryUpdateSchema } from "./inventory.schema";

describe("inventoryUpdateSchema", () => {
  it("accepts a positive addStock value", () => {
    const result = inventoryUpdateSchema.safeParse({ addStock: 25 });
    expect(result.success).toBe(true);
  });

  it("rejects a zero or negative addStock value", () => {
    const result = inventoryUpdateSchema.safeParse({ addStock: 0 });
    expect(result.success).toBe(false);
  });
});
